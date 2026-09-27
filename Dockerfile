# ==============================================================================
# Multi-stage Dockerfile para Deploy Unificado no Render (Tudo-em-Um)
# Compila o Frontend (React/Vite) e roda no Backend (FastAPI) com banco SQLite local
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build da aplicação React
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --prefer-offline || npm install

# Copia código do frontend e faz o build de produção (gera /app/frontend/dist)
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Runtime Python com FastAPI + SQLite
# ------------------------------------------------------------------------------
FROM python:3.11-slim
WORKDIR /app

# Instala dependências de sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configura ambiente Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/backend \
    PORT=8000

# Copia e instala requirements do backend
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copia o código do backend e os arquivos principais
COPY backend/ ./backend/
COPY .env* ./
# Copia o banco de dados com as 6.124 questões (se existir)
COPY questoes.db* ./

# Copia a pasta 'dist' gerada no frontend-builder para a estrutura esperada pelo FastAPI
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000

# O uvicorn vai rodar pelo módulo src.main na porta fornecida pelo ambiente (ex: 8000 ou porta do Render)
CMD ["sh", "-c", "uvicorn src.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000}"]
