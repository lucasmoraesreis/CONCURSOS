# ==============================================================================
# Dockerfile Ultrarresiliente e Otimizado para o Backend FastAPI (Linux / Render)
# ==============================================================================

FROM python:3.11-slim

WORKDIR /app

# Instala dependências de sistema essenciais (libpq, gcc para compilação C e curl para healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configurações de ambiente para Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PORT=8000

# Copia dependências e instala
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copia todo o código da aplicação e migrações Alembic
COPY . .

EXPOSE 8000

# Executa as migrações do Alembic e inicializa o servidor Uvicorn dinamicamente na porta atribuída pela Render ($PORT)
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
