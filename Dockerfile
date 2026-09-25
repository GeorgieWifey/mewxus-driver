# syntax=docker/dockerfile:1

# Mewxus production image.
#
# Three stages, because the frontend toolchain and the PHP runtime have nothing
# in common and the final image should not carry node, npm, or the dev
# dependency tree. The webdrver itself is client-side; this container only serves
# pages, proxies the firmware image, and owns the preset database.

# ---------------------------------------------------------------- assets
FROM node:22-alpine AS assets
WORKDIR /app
# Copy manifests first so a source-only change does not reinstall node_modules.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY uno.config.js vite.config.js ./
COPY resources ./resources
RUN npm run build

# --------------------------------------------------------------- composer
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
# --no-scripts: artisan is not runnable yet at this point (no .env, no app key),
# and Laravel's post-autoload scripts would fail the build. They are run at
# container start instead.
RUN composer install \
        --no-dev \
        --no-interaction \
        --no-progress \
        --prefer-dist \
        --optimize-autoloader \
        --no-scripts

# ---------------------------------------------------------------- runtime
# 8.4, not 8.3: composer.lock was resolved on 8.5, so the vendor tree's
# platform_check demands >= 8.4.1 and artisan dies before it can boot on 8.3.
FROM php:8.4-apache AS runtime

# sqlite3/pdo_sqlite: the preset store. libsqlite3-dev is required — the base
# image ships the sqlite runtime but not the pkg-config metadata the extension's
# configure step demands, and without it the build dies at "sqlite3 >= 3.7.7
# were not met". mbstring/bcmath/intl: Laravel and the protocol's byte maths.
# zip/gd: asset handling. libicu for intl.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libicu-dev \
        libsqlite3-dev \
        libzip-dev \
        libpng-dev \
        libonig-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_sqlite \
        mbstring \
        bcmath \
        intl \
        zip \
        gd \
        opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Serve out of public/. The default document root would expose .env and the
# whole application tree.
#
# MPM note: the base image ships prefork, and `a2enmod` can leave a second MPM
# enabled alongside it, which makes Apache refuse to start with "More than one
# MPM loaded". Both alternatives are disabled first so exactly one is loaded
# regardless of what the base image or a rebuild left behind.
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN set -eux; \
    rm -f /etc/apache2/mods-enabled/mpm_*.load /etc/apache2/mods-enabled/mpm_*.conf; \
    mv /etc/apache2/mods-available/mpm_event.* /tmp/ 2>/dev/null || true; \
    mv /etc/apache2/mods-available/mpm_worker.* /tmp/ 2>/dev/null || true; \
    a2enmod mpm_prefork rewrite headers; \
    sed -ri 's!/var/www/html!/var/www/html/public!g' \
        /etc/apache2/sites-available/*.conf \
        /etc/apache2/apache2.conf \
        /etc/apache2/conf-available/*.conf; \
    printf '<Directory /var/www/html/public>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n' > /etc/apache2/conf-available/laravel.conf; \
    a2enconf laravel; \
    echo "--- every LoadModule mpm line in /etc/apache2 ---"; \
    grep -rn "LoadModule mpm" /etc/apache2 || true; \
    test "$(grep -rc "LoadModule mpm" /etc/apache2 | awk -F: '{s+=\$2} END {print s}')" = "1"; \
    echo "--- apache2ctl configtest ---"; \
    apache2ctl configtest

# Opcache for a PHP app with no hot reload path.
RUN printf 'opcache.enable=1\n\
opcache.memory_consumption=192\n\
opcache.max_accelerated_files=20000\n\
opcache.validate_timestamps=0\n\
opcache.jit=tracing\n\
opcache.jit_buffer_size=64M\n' > /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /var/www/html

COPY --from=vendor /app/vendor ./vendor
COPY . .
COPY --from=assets /app/public/build ./public/build

# The preset database and Laravel's runtime caches live on a mounted volume so
# they survive redeploys. Railway mounts the volume at /data.
ENV DB_CONNECTION=sqlite \
    DB_DATABASE=/data/database.sqlite \
    APP_ENV=production \
    APP_DEBUG=false \
    APP_URL=http://localhost \
    SESSION_DRIVER=cookie \
    SESSION_PATH=/ \
    CACHE_STORE=file \
    QUEUE_CONNECTION=sync \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=warning

RUN mkdir -p /data storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data /data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint"]
CMD ["apache2-foreground"]
