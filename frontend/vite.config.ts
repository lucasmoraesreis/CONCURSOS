import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { spawn } from 'child_process'
import net from 'net'
import path from 'path'
import fs from 'fs'

function autoBackendPlugin(): Plugin {
  return {
    name: 'auto-backend',
    configureServer() {
      // Verifica se a porta 8000 já está ativa
      const socket = new net.Socket()
      socket.setTimeout(300)
      socket.on('connect', () => {
        socket.destroy()
      })
      socket.on('error', () => {
        socket.destroy()
        // Inicializa o backend automaticamente em background
        const rootDir = path.resolve(import.meta.dirname, '..')
        const venvPython = path.join(rootDir, '.venv', 'Scripts', 'python.exe')
        const pythonCmd = fs.existsSync(venvPython) ? venvPython : 'python'
        const backendDir = path.join(rootDir, 'backend')

        console.log('\x1b[36m%s\x1b[0m', '🚀 [AutoBackend] Inicializando Backend FastAPI na porta 8000...')
        const child = spawn(pythonCmd, ['-m', 'uvicorn', 'src.main:app', '--reload', '--port', '8000'], {
          cwd: backendDir,
          stdio: 'inherit',
        })

        child.on('error', (err) => {
          console.error('[AutoBackend] Erro ao disparar backend:', err)
        })

        process.on('exit', () => child.kill())
        process.on('SIGINT', () => {
          child.kill()
          process.exit()
        })
        process.on('SIGTERM', () => {
          child.kill()
          process.exit()
        })
      })
      socket.on('timeout', () => {
        socket.destroy()
      })
      socket.connect(8000, '127.0.0.1')
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    autoBackendPlugin(),
  ],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
