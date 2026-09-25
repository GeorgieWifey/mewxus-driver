# syntax=docker/dockerfile:1

# Mewxus production image.
#
# Three stages, because the frontend toolchain and the PHP runtime have nothing
# in common and the final image should not carry node, npm, or the dev
# dependency tree. The configurator itself is client-side; this container only
# serves pages, proxies the firmware image, and owns the preset database.
#
# The runtime serves through PHP's own server rather than Apache. That is a
# deliberate trade: the official Apache images ship an MPM arrangement that
# reports "More than one MPM loaded" even when exactly one LoadModule mpm line
# exists anywhere under /etc/apache2, and three attempts to pin that down did not
# resolve it. PHP's built-in server has no module system, so the whole failure
# class is gone and the image is considerably smaller. Replica count is pinned to
# 1 in railway.json and PHP_CLI_SERVER_WORKERS gives it a small worker pool, so
# its single-process design is not a limitation for this app.

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
# and Laravel's post-autoload scripts would fail the build. They run at
# container start instead.
RUN composer install \
        --no-dev \
        --no-interaction \
        --no-progress \
        --prefer-dist \
        --optimize-autoloader \
        --no-scripts

# ---------------------------------------------------------------- runtime
FROM php:8.4-cli-alpine AS runtime

# sqlite3/pdo_sqlite: the preset store. intl/mbstring: Laravel and the protocol's
# byte maths. opcache: this app ships no hot-reload path.
RUN apk add --no-cache \
        libintl \
        icu-libs \
        libpng \
        libzip \
        sqlite-libs \
    && apk add --no-cache --virtual .build-deps \
        icu-dev \
        libzip-dev \
        libpng-dev \
        sqlite-dev \
        $PHPIZE_DEPS \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_sqlite \
        mbstring \
        intl \
        zip \
        opcache \
    && apk del .build-deps

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
    SESSION_DRIVER=cookie \
    SESSION_PATH=/ \
    CACHE_STORE=file \
    QUEUE_CONNECTION=sync \
    LOG_CHANNEL=stderr \
    LOG_LEVEL=warning \
    PHP_CLI_SERVER_WORKERS=8

RUN mkdir -p /data storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/entrypoint
COPY docker/server.php /var/www/html/docker/server.php
RUN chmod +x /usr/local/bin/entrypoint

# Railway provides PORT; 8080 is the local default.
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint"]
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public", "docker/server.php"]
