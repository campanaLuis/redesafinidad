#!/bin/sh
set -e

# Genera el archivo .env que leen los scripts PHP desde __DIR__/../.env
# Las variables de entorno se inyectan en EasyPanel como env vars del contenedor.
cat > /var/www/html/.env <<EOF
APP_TOKEN_SECRET=${APP_TOKEN_SECRET:-}
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID:-}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN:-}
REPORTES_PGHOST=${REPORTES_PGHOST:-localhost}
REPORTES_PGPORT=${REPORTES_PGPORT:-5432}
REPORTES_PGUSER=${REPORTES_PGUSER:-}
REPORTES_PGPASSWORD=${REPORTES_PGPASSWORD:-}
REPORTES_PGDATABASE=${REPORTES_PGDATABASE:-}
PERSONAS_API_URL=${PERSONAS_API_URL:-http://127.0.0.1:8089}
EOF

exec "$@"
