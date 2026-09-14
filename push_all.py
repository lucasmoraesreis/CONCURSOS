import os
import subprocess
import sys
import io
from pathlib import Path

# Suporte UTF-8 no Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

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
    print("[*] 1. Configurando arquivos da arquitetura descentralizada (Supabase + Vercel + Render/Railway)...")
    
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

    # 1.3 Garantir roteamento SPA na Vercel (frontend/vercel.json)
    os.makedirs("frontend", exist_ok=True)
    vercel_json_path = Path("frontend/vercel.json")
    if not vercel_json_path.exists():
        vercel_json_path.write_text('{\n  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]\n}\n', encoding="utf-8")
        print("    [+] Arquivo frontend/vercel.json configurado.")

    # 1.4 Remover render.yaml antigo da raiz para desacoplar serviços
    render_yaml = Path("render.yaml")
    if render_yaml.exists():
        try:
            render_yaml.unlink()
            print("    [+] Arquivo render.yaml órfão removido com sucesso.")
        except Exception as e:
            print(f"    [-] Aviso ao remover render.yaml: {e}")


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
        
        # Remove render.yaml do índice se ainda estiver rastreado
        subprocess.run(["git", "rm", "-f", "render.yaml"], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
        
        # Adiciona os arquivos respeitando o .gitignore
        subprocess.run(["git", "add", "."], check=True)
        
        # Faz o commit do projeto limpo
        commit_msg = "Arquitetura Descentralizada: Supabase + Vercel + FastAPI Web Service"
        status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        if status.stdout.strip():
            subprocess.run(["git", "commit", "-m", commit_msg], check=True)
            print(f"    [+] Commit criado: '{commit_msg}'")
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
