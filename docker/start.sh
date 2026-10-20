#!/bin/sh
set -e

# Port imposé par l'hébergeur (Railway, Render…), 80 par défaut.
PORT="${PORT:-80}"
sed -ri "s/Listen [0-9]+/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# Première mise en route : crée les tables et les comptes si la base est vide (sans rien effacer sinon).
php /var/www/html/backend/bin/init.php || echo "Initialisation de la base reportée (base injoignable ?)."

exec apache2-foreground
