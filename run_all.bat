@echo off
chcp 65001 > nul
title Plataforma de Questões de Concurso — Launcher E2E

echo ======================================================================
echo    INICIANDO PLATAFORMA DE QUESTÕES DE CONCURSO (MODO DESENVOLVIMENTO)
echo    PostgreSQL 16 (pgvector) + FastAPI Backend + React Frontend (Vite)
echo ======================================================================
echo.

:: 1. Iniciar Banco de Dados via Docker
echo [1/3] Verificando e subindo banco PostgreSQL + pgvector...
docker-compose up -d postgres
if %errorlevel% neq 0 (
    echo [AVISO] Docker não pôde ser acionado automaticamente. Verifique se o Docker Desktop está aberto.
) else (
    echo [OK] Banco de Dados ativo na porta 5432.
)
echo.

:: Detectar interpretador Python (usa .venv se existir)
set "PY_EXE=python"
if exist "%~dp0.venv\Scripts\python.exe" set "PY_EXE=%~dp0.venv\Scripts\python.exe"
if exist "%~dp0backend\.venv\Scripts\python.exe" set "PY_EXE=%~dp0backend\.venv\Scripts\python.exe"

:: 2. Iniciar Servidor Backend FastAPI em nova janela
echo [2/3] Inicializando API FastAPI na porta 8000...
start "Backend API - FastAPI" cmd /k "cd /d %~dp0backend && "%PY_EXE%" -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000"
echo [OK] Backend rodando em http://localhost:8000 (Swagger: http://localhost:8000/docs)
echo.

:: 3. Iniciar Servidor Frontend React em nova janela
echo [3/3] Inicializando Frontend React (Vite)...
start "Frontend UI - React" cmd /k "cd /d %~dp0frontend && npm run dev"
echo [OK] Frontend inicializando (normalmente em http://localhost:5173)
echo.

:: 4. Aguardar inicialização e abrir navegador
echo Aguardando 4 segundos para os servidores subirem...
timeout /t 4 /nobreak > nul
start http://localhost:5173

echo ======================================================================
echo   SISTEMA OPERACIONAL!
echo   - Frontend: http://localhost:5173
echo   - Backend API: http://localhost:8000
echo   - Documentação Swagger: http://localhost:8000/docs
echo.
echo   Para encerrar, feche as janelas do Backend e Frontend ou aperte Ctrl+C nelas.
echo ======================================================================
pause
