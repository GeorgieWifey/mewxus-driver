#!/usr/bin/env bash
#
# Container start-up for Mewxus.
#
# Order matters: Laravel reads .env before the environment, and a stale cached
# config would pin the build-time values over Railway's runtime ones. So caches
# are cleared, the schema is migrated, then the caches are rebuilt.
set -euo pipefail

cd /var/www/html

# ---- database ---------------------------------------------------------------
# The volume mounts at /data. On a first deploy the directory exists but the
# file does not, and SQLite will not create it for you.
mkdir -p "$(dirname "${DB_DATABASE:-/data/database.sqlite}")"
if [ ! -f "${DB_DATABASE:-/data/database.sqlite}" ]; then
    echo "[mewxus] creating ${DB_DATABASE:-/data/database.sqlite}"
    touch "${DB_DATABASE:-/data/database.sqlite}"
fi
chown -R www-data:www-data "$(dirname "${DB_DATABASE:-/data/database.sqlite}")" 2>/dev/null || true

# ---- storage ----------------------------------------------------------------
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# ---- application key --------------------------------------------------------
# Generated once and kept in the volume, so sessions and encrypted cookies
# survive a redeploy. An APP_KEY supplied through the environment wins.
KEY_FILE=/data/app.key
if [ -z "${APP_KEY:-}" ]; then
    if [ -f "$KEY_FILE" ]; then
        export APP_KEY="$(cat "$KEY_FILE")"
    else
        APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
        printf '%s' "$APP_KEY" > "$KEY_FILE"
        chmod 600 "$KEY_FILE"
        echo "[mewxus] generated a new APP_KEY"
    fi
fi

# ---- migrate ----------------------------------------------------------------
# Clear first: a config cache baked at image build time would override the
# runtime environment above.
php artisan config:clear
php artisan route:clear
php artisan view:clear

php artisan migrate --force --no-interaction

# ---- route permissions back to the web user ---------------------------------
chown -R www-data:www-data storage bootstrap/cache "$(dirname "${DB_DATABASE:-/data/database.sqlite}")"

php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "[mewxus] ready on port 80"
exec "$@"
