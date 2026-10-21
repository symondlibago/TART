# syntax=docker/dockerfile:1

############################
# 1. Composer dependencies #
############################
FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./

# --ignore-platform-reqs because the extensions live in the runtime image, not
# here. --no-scripts because artisan is not available until the app is copied.
RUN composer install \
      --no-dev \
      --prefer-dist \
      --no-interaction \
      --no-progress \
      --no-scripts \
      --ignore-platform-reqs \
      --optimize-autoloader

####################
# 2. Runtime image #
####################
FROM php:8.2-fpm-alpine

RUN apk add --no-cache \
      nginx supervisor libpq libpng libjpeg-turbo freetype icu-libs \
    && apk add --no-cache --virtual .build-deps \
      postgresql-dev libpng-dev libjpeg-turbo-dev freetype-dev icu-dev $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    # pdo_pgsql: Supabase. gd: re-encoding attendance photos. opcache: speed.
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql pgsql gd intl opcache \
    && apk del .build-deps

WORKDIR /var/www/html

COPY --from=vendor /app/vendor ./vendor
COPY . .

COPY docker/nginx.conf /etc/nginx/nginx.conf.template
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Render injects PORT; this is only the local default.
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["entrypoint"]
