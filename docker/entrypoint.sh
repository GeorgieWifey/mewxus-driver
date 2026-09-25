#!/bin/sh
#
# Container start-up for Mewxus.
#
# Order matters: Laravel reads .env before the environment, and a stale cached
# config would pin build-time values over Railway's runtime ones. So caches are
# cleared, the schema is migrated, then the caches are rebuilt — and only after
# all of that does the server take over the port.
set -eu

cd /var/www/html

DB_FILE="${DB_DATABASE:-/data/database.sqlite}"
DB_DIR="$(dirname "$DB_FILE")"

# ---- database ---------------------------------------------------------------
# The volume mounts at /data. On a first deploy the directory exists but the file
# does not, and SQLite will not create it for you.
mkdir -p "$DB_DIR"
if [ ! -f "$DB_FILE" ]; then
    echo "[mewxus] creating $DB_FILE"
    : > "$DB_FILE"
fi

# ---- storage ----------------------------------------------------------------
mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

# ---- application key --------------------------------------------------------
# Generated once and kept on the volume, so sessions and encrypted cookies survive
# a redeploy. An APP_KEY supplied through the environment wins.
KEY_FILE=/data/app.key
if [ -z "${APP_KEY:-}" ]; then
    if [ -f "$KEY_FILE" ]; then
        APP_KEY="$(cat "$KEY_FILE")"
    else
        APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
        printf '%s' "$APP_KEY" > "$KEY_FILE"
        chmod 600 "$KEY_FILE"
        echo "[mewxus] generated a new APP_KEY"
    fi
    export APP_KEY
fi

# ---- reset stale caches -----------------------------------------------------
php artisan config:clear
php artisan route:clear
php artisan view:clear

# ---- migrate ----------------------------------------------------------------
php artisan migrate --force --no-interaction

# ---- rebuild caches ---------------------------------------------------------
php artisan config:cache
php artisan route:cache
php artisan view:cache

PORT="${PORT:-8080}"
echo "[mewxus] serving on 0.0.0.0:${PORT}"

# exec so the server is PID 1 and receives signals directly.
exec php -S "0.0.0.0:${PORT}" -t public docker/server.php
