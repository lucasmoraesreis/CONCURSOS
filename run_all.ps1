# PowerShell Launcher para a Plataforma de Questões de Concurso
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   INICIANDO PLATAFORMA DE QUESTOES DE CONCURSO (MODO LOCAL)          " -ForegroundColor Cyan
Write-Host "   PostgreSQL 16 (pgvector) + FastAPI Backend + React Frontend        " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$RootPath = $PSScriptRoot

# 1. Banco de Dados via Docker (se Docker Desktop estiver ativo)
Write-Host "[1/3] Verificando banco PostgreSQL + pgvector via Docker..." -ForegroundColor Yellow
try {
    $dockerCheck = docker-compose -f "$RootPath\docker-compose.yml" up -d postgres 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Container de banco de dados ativo na porta 5432." -ForegroundColor Green
    } else {
        Write-Host "[AVISO] Docker Desktop fechado ou inativo. O backend usara a conexao do backend/.env (Local ou Supabase)." -ForegroundColor DarkYellow
    }
} catch {
    Write-Host "[AVISO] Nao foi possivel conectar ao Docker. Prosseguindo..." -ForegroundColor DarkYellow
}
Write-Host ""

# 2. Backend FastAPI
$PythonCmd = "python"
if (Test-Path "$RootPath\.venv\Scripts\python.exe") {
    $PythonCmd = "$RootPath\.venv\Scripts\python.exe"
} elseif (Test-Path "$RootPath\backend\.venv\Scripts\python.exe") {
    $PythonCmd = "$RootPath\backend\.venv\Scripts\python.exe"
}

Write-Host "[2/3] Abrindo janela do Backend FastAPI (porta 8000)..." -ForegroundColor Yellow
$BackendCmd = "Set-Location -LiteralPath '$RootPath\backend'; & '$PythonCmd' -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCmd
Write-Host "[OK] Backend rodando em http://localhost:8000 (Swagger: http://localhost:8000/docs)" -ForegroundColor Green
Write-Host ""

# 3. Frontend React (Vite)
Write-Host "[3/3] Abrindo janela do Frontend React (Vite)..." -ForegroundColor Yellow
$FrontendCmd = "Set-Location -LiteralPath '$RootPath\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCmd
Write-Host "[OK] Frontend inicializado." -ForegroundColor Green
Write-Host ""

# 4. Abrir Navegador
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Plataforma iniciada com sucesso!" -ForegroundColor Green
Write-Host "   - Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "   - Backend:   http://localhost:8000" -ForegroundColor White
Write-Host "   - Swagger:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
