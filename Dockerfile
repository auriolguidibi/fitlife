# FitLife : application (React) + API PHP dans une seule image.
# La base MySQL est fournie par l'hébergeur (variables DB_* ou MYSQL*).

# ---------- 1. Construction de l'interface (mode API réel) ----------
FROM node:20-alpine AS front
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_DATA_MODE=api
RUN npx vite build

# ---------- 2. Serveur PHP + Apache ----------
FROM php:8.3-apache
RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite \
 && sed -ri 's!/var/www/html!/var/www/html/backend/public!g' /etc/apache2/sites-available/000-default.conf \
 && sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

WORKDIR /var/www/html
COPY backend/ backend/
COPY database/ database/
# Fichiers de l'interface servis par Apache ; la page d'entrée est servie par index.php
COPY --from=front /app/dist/ backend/public/
RUN mv backend/public/index.html app.html \
 && mkdir -p backend/public/uploads/avatars \
 && chown -R www-data:www-data backend/public/uploads

ENV APP_ENV=production \
    FRONTEND_INDEX=/var/www/html/app.html

COPY docker/start.sh /usr/local/bin/start-fitlife
RUN chmod +x /usr/local/bin/start-fitlife
CMD ["start-fitlife"]
