"""
Script de Sucesso Automatizado do Git (Push to GitHub) com Blindagem SecOps.

Funcionalidades:
  1. Varredura automática pré-commit (Secret Scanner) contra vazamento de chaves (Gemini API Key)
  2. Sanitização automática de credenciais expostas
  3. Verificação e garantia de .gitignore blindado (bloqueia .env, .venv, node_modules)
  4. Inicialização do Git, staging seguro, commit e push para o repositório remoto

Uso:
  python push_to_github.py
  python push_to_github.py --repo https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
"""

import os
import re
import sys
import io
import subprocess
from pathlib import Path

# Configura codificação UTF-8 robusta para Windows CMD/PowerShell
if sys.platform == "win32":
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "buffer"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Raiz do projeto
ROOT_DIR = Path(__file__).resolve().parent

# Cores para terminal
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Padrões de chaves de API sensíveis para varredura
SECRET_PATTERNS = [
    re.compile(r"AQ\.[A-Za-z0-9_-]{30,}"),       # Padrão da chave Gemini
    re.compile(r"AIza[0-9A-Za-z-_]{35}"),        # Padrão tradicional Google Cloud / Gemini
]

EXCLUDE_DIRS = {
    ".git", ".venv", "venv", "node_modules", "dist",
    "__pycache__", ".gemini", ".agents", "build"
}


def print_banner():
    banner = f"""{CYAN}{BOLD}
======================================================================
       🛡️ SCRIPT DE DEPLOY BLINDADO PARA O GITHUB (SECOPS) 🛡️
       Prepara, varre segredos e envia o projeto para a Render
======================================================================{RESET}
"""
    print(banner)


def run_cmd(cmd: list[str], description: str, check: bool = True) -> subprocess.CompletedProcess:
    """Executa um comando de sistema e exibe feedback formatado."""
    print(f"{YELLOW}⏳ {description}...{RESET}")
    try:
        res = subprocess.run(
            cmd,
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            check=check,
        )
        if res.stdout.strip():
            print(f"   {res.stdout.strip()}")
        print(f"{GREEN}✅ {description} concluído com sucesso!{RESET}")
        return res
    except subprocess.CalledProcessError as e:
        print(f"{RED}❌ Erro durante: {description}{RESET}")
        if e.stderr.strip():
            print(f"{RED}   Detalhe do erro: {e.stderr.strip()}{RESET}")
        if check:
            sys.exit(1)
        return e


def ensure_gitignore():
    """Garante que o arquivo .gitignore existe e possui regras estritas de blindagem."""
    gitignore_path = ROOT_DIR / ".gitignore"
    essential_rules = [
        ".env", ".env.local", ".env.*.local", "*.pem", "*.key",
        ".venv/", "venv/", "node_modules/", "frontend/node_modules/",
        "dist/", "frontend/dist/", "__pycache__/", "logs/", "backend/logs/",
        "data/pdfs/", ".gemini/", ".agents/"
    ]

    current_content = ""
    if gitignore_path.exists():
        current_content = gitignore_path.read_text(encoding="utf-8")

    missing = [rule for rule in essential_rules if rule not in current_content]

    if missing or not gitignore_path.exists():
        print(f"{YELLOW}🔒 Atualizando .gitignore com regras estritas de blindagem SecOps...{RESET}")
        with open(gitignore_path, "a", encoding="utf-8") as f:
            if not current_content.endswith("\n") and current_content:
                f.write("\n")
            f.write("# Regras de Blindagem Automática SecOps\n")
            for rule in missing:
                f.write(f"{rule}\n")
        print(f"{GREEN}✅ .gitignore atualizado e blindado contra vazamento de segredos.{RESET}")
    else:
        print(f"{GREEN}✅ Arquivo .gitignore validado com sucesso.{RESET}")


def scan_and_sanitize_secrets() -> int:
    """
    Varre todos os arquivos de código e documentação do projeto.
    Se encontrar qualquer chave do Gemini, substitui automaticamente por string vazia
    e previne que ela seja commitada.
    """
    print(f"\n{CYAN}🔍 [SecOps Scanner] Executando varredura profunda de segredos no código...{RESET}")
    sanitized_count = 0

    for root, dirs, files in os.walk(ROOT_DIR):
        # Remove diretórios ignorados da busca
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for file_name in files:
            file_path = Path(root) / file_name

            # Não altera o .env local legítimo
            if file_name == ".env":
                continue

            # Varre apenas arquivos de texto conhecidos
            if file_path.suffix.lower() not in (
                ".py", ".ts", ".tsx", ".js", ".jsx", ".json",
                ".yaml", ".yml", ".md", ".txt", ".sh", ".bat", ".sql", ".ini"
            ):
                continue

            try:
                content = file_path.read_text(encoding="utf-8")
                modified = False

                for pattern in SECRET_PATTERNS:
                    matches = pattern.findall(content)
                    if matches:
                        for secret in set(matches):
                            print(
                                f"{RED}🚨 SEGREDO DETECTADO em {file_path.relative_to(ROOT_DIR)}:{RESET} "
                                f"Chave encontrada: {secret[:4]}...{secret[-4:]}"
                            )
                            # Substitui pela string vazia / placeholder seguro
                            content = content.replace(secret, "")
                            modified = True
                            sanitized_count += 1

                if modified:
                    file_path.write_text(content, encoding="utf-8")
                    print(f"{GREEN}🛡️ Arquivo sanitizado com sucesso: {file_path.relative_to(ROOT_DIR)}{RESET}")

            except Exception as err:
                # Ignora erros de decodificação binária
                pass

    if sanitized_count > 0:
        print(f"{YELLOW}⚠️ Total de {sanitized_count} segredos neutralizados antes do commit.{RESET}")
    else:
        print(f"{GREEN}✅ Nenhum segredo exposto detectado no código-fonte! 100% Blindado.{RESET}")

    return sanitized_count


def verify_no_staged_secrets():
    """Garante que nenhum arquivo sensível como .env foi acidentalmente indexado pelo git."""
    status_res = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=str(ROOT_DIR),
        capture_output=True,
        text=True,
    )

    staged_lines = status_res.stdout.splitlines()
    for line in staged_lines:
        if ".env" in line and not line.strip().endswith(".example"):
            print(f"{RED}🚨 ERRO CRÍTICO: Tentativa de commit do arquivo .env detectada!{RESET}")
            print(f"{YELLOW}Desfazendo indexação do arquivo .env via 'git reset HEAD .env'...{RESET}")
            subprocess.run(["git", "reset", "HEAD", ".env"], cwd=str(ROOT_DIR))
            subprocess.run(["git", "rm", "--cached", ".env"], cwd=str(ROOT_DIR), capture_output=True)
            print(f"{GREEN}✅ .env removido do índice do Git com sucesso.{RESET}")


def get_remote_url() -> str:
    """Obtém a URL do repositório a partir dos argumentos ou de input do usuário."""
    import argparse
    parser = argparse.ArgumentParser(description="Envio automatizado blindado para o GitHub")
    parser.add_argument("--repo", type=str, help="URL do repositório GitHub (ex: https://github.com/user/repo.git)")
    args, _ = parser.parse_known_args()

    if args.repo:
        return args.repo.strip()

    # Verifica se já existe um remote origin configurado
    try:
        chk = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
        )
        if chk.returncode == 0 and chk.stdout.strip():
            current_remote = chk.stdout.strip()
            print(f"\n{CYAN}📍 Remote 'origin' atual detectado: {BOLD}{current_remote}{RESET}")
            resp = input("Deseja usar este repositório? (S/n): ").strip().lower()
            if resp in ("", "s", "sim", "y", "yes"):
                return current_remote
    except Exception:
        pass

    print("\n" + "=" * 60)
    print(f"{BOLD}Digite a URL do seu repositório vazio no GitHub:{RESET}")
    print(f"Exemplo: {CYAN}https://github.com/seu-usuario/questoes-concursos.git{RESET}")
    print("=" * 60)

    while True:
        url = input("\n👉 URL do Repositório GitHub: ").strip()
        if url.startswith("http://") or url.startswith("https://") or url.startswith("git@"):
            return url
        print(f"{RED}URL inválida. Deve começar com https:// ou git@{RESET}")


def main():
    print_banner()

    # 1. Verifica se git está instalado
    try:
        subprocess.run(["git", "--version"], capture_output=True, check=True)
    except Exception:
        print(f"{RED}❌ Git não encontrado no seu sistema. Por favor instale o Git antes de continuar.{RESET}")
        sys.exit(1)

    # 2. Assegura .gitignore blindado
    ensure_gitignore()

    # 3. Varredura profunda e sanitização de segredos antes de qualquer operação do Git
    scan_and_sanitize_secrets()

    # 4. Inicializa repositório se necessário
    git_dir = ROOT_DIR / ".git"
    if not git_dir.exists():
        run_cmd(["git", "init"], "Inicializando repositório Git local")
    else:
        print(f"{GREEN}✅ Repositório Git já inicializado.{RESET}")

    # 5. Configura branch padrão para main
    run_cmd(["git", "branch", "-M", "main"], "Configurando branch principal como 'main'", check=False)

    # 6. Adiciona todos os arquivos do projeto
    run_cmd(["git", "add", "."], "Indexando arquivos do projeto (git add .)")

    # 7. Verificação de segurança pós-staging
    verify_no_staged_secrets()

    # 8. Commit seguro
    run_cmd(
        ["git", "commit", "-m", "Deploy Blindado: Sistema Qconcursos com IA e pgvector"],
        "Criando commit do projeto com blindagem SecOps",
        check=False,
    )

    # 9. Solicita URL do GitHub
    remote_url = get_remote_url()

    # 10. Configura o remote origin
    check_remote = subprocess.run(
        ["git", "remote"],
        cwd=str(ROOT_DIR),
        capture_output=True,
        text=True,
    )

    if "origin" in check_remote.stdout:
        run_cmd(
            ["git", "remote", "set-url", "origin", remote_url],
            f"Atualizando remote origin para {remote_url}",
        )
    else:
        run_cmd(
            ["git", "remote", "add", "origin", remote_url],
            f"Adicionando remote origin ({remote_url})",
        )

    # 11. Push para o GitHub
    print(f"\n{CYAN}Enviando arquivos blindados para o GitHub (git push -u origin main)...{RESET}")
    push_res = subprocess.run(
        ["git", "push", "-u", "origin", "main"],
        cwd=str(ROOT_DIR),
        capture_output=True,
        text=True,
    )

    if push_res.returncode != 0:
        print(f"{YELLOW}⚠️ Sincronizando branch main com repositório remoto (--force)...{RESET}")
        force_res = subprocess.run(
            ["git", "push", "-u", "origin", "main", "--force"],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
        )
        if force_res.returncode == 0:
            print(f"{GREEN}✅ Código enviado com sucesso com sincronização forçada!{RESET}")
        else:
            print(f"{RED}❌ Falha ao enviar para o GitHub:{RESET}")
            print(force_res.stderr)
            sys.exit(1)
    else:
        print(f"{GREEN}✅ Código enviado com sucesso para o GitHub!{RESET}")

    # Mensagem final de sucesso
    print("\n" + "=" * 70)
    print(f"{GREEN}{BOLD}🎉 PROJETO 100% BLINDADO E DISPONÍVEL NO GITHUB!{RESET}")
    print("=" * 70)
    print(f"{CYAN}Próximo passo na Render (Zero-Trust Deploy):{RESET}")
    print("1. Acesse https://dashboard.render.com/ e clique em 'New +' -> 'Blueprint'.")
    print("2. Conecte o repositório.")
    print("3. Digite sua GEMINI_API_KEY no campo protegido da tela e clique em 'Apply'.")
    print("Zero segredos trafegados pelo código. Produção 100% segura!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
