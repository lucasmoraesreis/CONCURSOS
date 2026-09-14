import os
import subprocess
import sys
from pathlib import Path

# CONFIGURAÇÕES DA CHAVE DE API E REPOSITÓRIO OFICIAL
REPO_URL = "https://github.com/lucasmoraesreis/CONCURSOS"

def obter_gemini_key() -> str:
    """Lê a chave do arquivo backend/.env ou variável de ambiente sem expor no commit."""
    env_path = Path("backend/.env")
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("GEMINI_API_KEY="):
                val = line.split("=", 1)[1].strip()
                if val:
                    return val
    # Fallback seguro
    return os.getenv("GEMINI_API_KEY", "")


def criar_arquivos_infraestrutura():
    print("[*] 1. Criando e blindando arquivos de infraestrutura...")
    
    # 1.1 Criar pasta do backend se não existir e salvar o .env camuflado
    os.makedirs("backend", exist_ok=True)
    gemini_key = obter_gemini_key()
    with open("backend/.env", "w", encoding="utf-8") as f:
        f.write(f"GEMINI_API_KEY={gemini_key}\n")
        f.write("GEMINI_MODEL=gemini-2.5-flash\n")
    print("    [+] Arquivo backend/.env configurado com sucesso.")

    # 1.2 Criar o arquivo .gitignore na raiz do projeto
    gitignore_content = """# Credenciais e Ambientes
.env
.env*
*.env
.env.local
.venv/
venv/
__pycache__/
node_modules/
frontend/node_modules/
dist/
frontend/dist/
build/
*.db
*.sqlite
*.pdf
data/
logs/
backend/logs/
.DS_Store
.vscode/
.idea/
.gemini/
.agents/
"""
    with open(".gitignore", "w", encoding="utf-8") as f:
        f.write(gitignore_content)
    print("    [+] Arquivo .gitignore criado na raiz.")

    # 1.3 Criar o Blueprint da Render (render.yaml) na raiz do projeto
    render_yaml_content = """databases:
  - name: qconcursos-db
    plan: free
    postgresMajorVersion: 16

services:
  - type: web
    name: qconcursos-backend
    runtime: docker
    plan: free
    dockerfilePath: backend/Dockerfile
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: qconcursos-db
          property: connectionString
      - key: GEMINI_API_KEY
        sync: false

  - type: web
    name: qconcursos-frontend
    runtime: docker
    plan: free
    dockerfilePath: frontend/Dockerfile
    envVars:
      - key: VITE_API_URL
        fromService:
          type: web
          name: qconcursos-backend
          property: url
"""
    with open("render.yaml", "w", encoding="utf-8") as f:
        f.write(render_yaml_content)
    print("    [+] Arquivo render.yaml (Blueprint Render) configurado.")


def executar_comandos_git():
    print("\n[*] 2. Iniciando orquestração automatizada do Git...")
    
    try:
        # Inicializa o Git
        subprocess.run(["git", "init"], check=True)
        
        # Altera o nome da branch principal para main
        subprocess.run(["git", "checkout", "-B", "main"], check=True)
        
        # Configura ou atualiza o repositório remoto
        subprocess.run(["git", "remote", "remove", "origin"], stderr=subprocess.DEVNULL)
        subprocess.run(["git", "remote", "add", "origin", REPO_URL], check=True)
        
        # Adiciona os arquivos respeitando o .gitignore
        subprocess.run(["git", "add", "."], check=True)
        
        # Faz o commit do projeto limpo
        status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        if status.stdout.strip():
            subprocess.run(["git", "commit", "-m", "Deploy Automático: Sistema Qconcursos Finalizado e Camuflado"], check=True)
        else:
            print("    [*] Repositório já está com as alterações comitadas.")
        
        # Faz o upload forçado para limpar o repositório no GitHub
        print("[*] Enviando arquivos para o GitHub (isso pode levar alguns segundos)...")
        subprocess.run(["git", "push", "-u", "origin", "main", "--force"], check=True)
        
        print("\n=======================================================")
        print("🎉 SUCESSO TOTAL! Seu código já está no GitHub.")
        print(f"🔗 {REPO_URL}")
        print("=======================================================")
        
    except subprocess.CalledProcessError as e:
        print(f"\n[-] Erro ao executar comandos do Git: {e}")
        print("\n💡 Se o GitHub solicitar autenticação de usuário no navegador, conclua o login na janela aberta.")
        sys.exit(1)


if __name__ == "__main__":
    criar_arquivos_infraestrutura()
    executar_comandos_git()
