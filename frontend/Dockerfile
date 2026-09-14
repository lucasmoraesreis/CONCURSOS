# ==============================================================================
# Multi-stage Dockerfile para o Frontend React + Vite
# Produção: Build estático otimizado servido via Nginx Alpine
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build da aplicação React
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline || npm install

# Copia código-fonte e compila bundle de produção
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Runtime Nginx Alpine (imagem leve ~25MB)
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove configuração padrão do nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copia configuração customizada com proxy para o backend e SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia assets compilados do builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Checagem de integridade HTTP
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
