#!/bin/sh
set -e

# Render (and most hosts) hand the container a port to listen on.
PORT="${PORT:-8080}"
sed "s/__PORT__/${PORT}/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
mkdir -p /tmp/client_body /tmp/proxy /tmp/fastcgi /tmp/uwsgi /tmp/scgi

cd /var/www/html

# Fail loudly at boot instead of serving 500s to every request.
if [ -z "${APP_KEY}" ]; then
  echo "FATAL: APP_KEY is not set. Generate one with: php artisan key:generate --show"
  exit 1
fi

# Caching these turns a pile of filesystem work into a single include per
# request. Must happen after env vars are available, so it is done here rather
# than at build time.
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Opt-in, because an automatic migration on every deploy is a good way to be
# surprised. Set RUN_MIGRATIONS=true on the first deploy and after schema work.
if [ "${RUN_MIGRATIONS}" = "true" ]; then
  echo "Running migrations..."
  php artisan migrate --force
fi

echo "Starting nginx + php-fpm on port ${PORT}"
exec supervisord -c /etc/supervisord.conf
