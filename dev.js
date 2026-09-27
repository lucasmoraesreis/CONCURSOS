const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\x1b[36m%s\x1b[0m', '=======================================================');
console.log('\x1b[36m%s\x1b[0m', '🚀 Plataforma de Concursos — Inicializando Fullstack...');
console.log('\x1b[36m%s\x1b[0m', '=======================================================');

// Localiza o executável do Python no ambiente virtual
const venvPythonWin = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
const venvPythonUnix = path.join(__dirname, '.venv', 'bin', 'python');
const pythonCmd = fs.existsSync(venvPythonWin) ? venvPythonWin : (fs.existsSync(venvPythonUnix) ? venvPythonUnix : 'python');

console.log('\x1b[32m%s\x1b[0m', `[Backend] Usando Python: ${pythonCmd}`);
console.log('\x1b[32m%s\x1b[0m', `[Backend] Iniciando FastAPI na porta 8000...`);

// 1. Inicia o Backend FastAPI
const backend = spawn(pythonCmd, ['-m', 'uvicorn', 'src.main:app', '--host', '0.0.0.0', '--port', '8000'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true,
});

// 2. Inicia o Frontend Vite
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
console.log('\x1b[34m%s\x1b[0m', `[Frontend] Iniciando Vite na porta 5173...`);

const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true,
});

backend.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `[Backend Erro]: ${err.message}`);
});

frontend.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `[Frontend Erro]: ${err.message}`);
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Encerrando servidores Fullstack...');
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
