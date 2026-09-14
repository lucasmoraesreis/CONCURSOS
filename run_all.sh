#!/usr/bin/env bash
# Script de automação unificado para Linux / macOS / WSL

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "======================================================================"
echo "    INICIANDO PLATAFORMA DE QUESTÕES DE CONCURSO (BASH LAUNCHER)"
echo "    PostgreSQL 16 (pgvector) + FastAPI Backend + React Frontend (Vite)"
echo "======================================================================"
echo ""

# 1. Docker
echo "[1/3] Subindo PostgreSQL 16 com pgvector..."
docker-compose -f "$DIR/docker-compose.yml" up -d postgres
echo "[OK] Banco de Dados ativo na porta 5432."
echo ""

# 2. Backend
echo "[2/3] Iniciando backend FastAPI em background..."
(cd "$DIR/backend" && python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000) &
BACKEND_PID=$!
echo "[OK] Backend rodando (PID $BACKEND_PID) em http://localhost:8000"
echo ""

# 3. Frontend
echo "[3/3] Iniciando frontend React..."
(cd "$DIR/frontend" && npm run dev) &
FRONTEND_PID=$!
echo "[OK] Frontend rodando (PID $FRONTEND_PID) em http://localhost:5173"
echo ""

# Função de limpeza ao pressionar Ctrl+C
cleanup() {
    echo ""
    echo "Encerrando servidores em background..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "Serviços finalizados."
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "======================================================================"
echo "✨ Todos os serviços estão ativos!"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend API: http://localhost:8000"
echo "   - Swagger Docs: http://localhost:8000/docs"
echo ""
echo "Pressione Ctrl+C para finalizar todos os processos."
echo "======================================================================"

wait
