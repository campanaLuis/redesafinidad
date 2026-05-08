# ─────────────────────────────────────────────
# Stage 1: Build React/Vite frontend
# ─────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /build

COPY package.json bun.lock* bun.lockb* ./
RUN bun install --frozen-lockfile

COPY . .

# VITE_ vars se hornean en el build; pásalas como build args en EasyPanel
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

RUN bun run build

# ─────────────────────────────────────────────
# Stage 2: Runtime – Nginx + PHP-FPM + Python3
# ─────────────────────────────────────────────
FROM php:8.2-fpm-alpine

# Instalar nginx, supervisor, python3 y dependencias para pdo_pgsql
RUN apk add --no-cache \
    nginx \
    supervisor \
    python3 \
    curl \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && mkdir -p /run/nginx /var/log/supervisor

# Copiar dist del frontend
COPY --from=builder /build/dist /var/www/html

# Copiar API PHP + python vendor
COPY api /var/www/html/api

# Copiar configs
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
