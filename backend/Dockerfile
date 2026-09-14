# ==============================================================================
# Multi-stage Dockerfile para o Backend FastAPI
# Produção: Imagem mínima, segura (non-root) e otimizada
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder (compilação de dependências e wheels)
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# Instala dependências de build necessárias para compilar pacotes C
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Cria virtualenv isolado
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copia e instala dependências
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# ------------------------------------------------------------------------------
# Stage 2: Runtime (imagem final enxuta)
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS runner

WORKDIR /app

# Instala apenas bibliotecas de runtime necessárias (libpq para postgres) e curl para healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copia o virtualenv do estágio de build
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Cria usuário não-privilegiado para execução segura
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m appuser

# Cria diretório de logs e ajusta permissões
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

# Copia o código da aplicação e configuração do Alembic
COPY --chown=appuser:appgroup alembic.ini .
COPY --chown=appuser:appgroup alembic ./alembic
COPY --chown=appuser:appgroup src ./src

# Alterna para o usuário não-root
USER appuser

EXPOSE 8000

# Healthcheck do container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Inicializa migrações do Alembic e sobe a aplicação Uvicorn
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 2"]
