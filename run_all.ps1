# PowerShell Launcher para a Plataforma de Questões de Concurso
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   INICIANDO PLATAFORMA DE QUESTÕES DE CONCURSO (POWERSHELL LAUNCHER) " -ForegroundColor Cyan
Write-Host "   PostgreSQL 16 (pgvector) + FastAPI Backend + React Frontend        " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$RootPath = $PSScriptRoot

# 1. Docker
Write-Host "[1/3] Subindo PostgreSQL com pgvector via docker-compose..." -ForegroundColor Yellow
try {
    docker-compose -f "$RootPath\docker-compose.yml" up -d postgres
    Write-Host "[OK] Container de banco de dados ativo na porta 5432." -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Falha ao acionar o docker-compose. Certifique-se de que o Docker Desktop está rodando." -ForegroundColor Yellow
}
Write-Host ""

# 2. Backend
$PythonCmd = "python"
if (Test-Path "$RootPath\.venv\Scripts\python.exe") {
    $PythonCmd = "$RootPath\.venv\Scripts\python.exe"
} elseif (Test-Path "$RootPath\backend\.venv\Scripts\python.exe") {
    $PythonCmd = "$RootPath\backend\.venv\Scripts\python.exe"
}

Write-Host "[2/3] Abrindo janela do Backend FastAPI (porta 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\backend'; & '$PythonCmd' -m uvicorn src.main:app --reload --port 8000"
Write-Host "[OK] Backend rodando em http://localhost:8000 (Swagger: http://localhost:8000/docs)" -ForegroundColor Green
Write-Host ""

# 3. Frontend
Write-Host "[3/3] Abrindo janela do Frontend React (Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\frontend'; npm run dev"
Write-Host "[OK] Frontend inicializado." -ForegroundColor Green
Write-Host ""

# 4. Abrir Navegador
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "✨ Plataforma pronta para testes e estudo!" -ForegroundColor Green
Write-Host "   - Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "   - Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "   - Swagger:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
