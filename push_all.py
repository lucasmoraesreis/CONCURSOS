#!/usr/bin/env python3
"""
==============================================================================
push_all.py — Implementação Automática: Publicação no GitHub e Deploy Render
==============================================================================

Orquestra 100% dos passos de versionamento e push:
1. git init na pasta raiz
2. git checkout -B main
3. git remote add/set-url origin https://github.com/lucasmoraesreis/CONCURSOS
4. git add . (respeitando o .gitignore)
5. git commit -m "Deploy Automático: Sistema Qconcursos Finalizado e Camuflado"
6. git push -u origin main --force
"""

import sys
import io
import subprocess
from pathlib import Path

# Suporte UTF-8 no Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent
REPO_URL = "https://github.com/lucasmoraesreis/CONCURSOS"


def log_step(step_num: int, title: str):
    print(f"\n[PASSO {step_num}] {title}")


def log_ok(msg: str):
    print(f"  [OK] {msg}")


def log_err(msg: str):
    print(f"  [ERRO] {msg}")


def run_cmd(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        cwd=PROJECT_ROOT,
        check=check,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def main():
    print("=" * 75)
    print("  🚀 PUBLICADOR AUTOMÁTICO DE DEPLOY — GITHUB / RENDER")
    print(f"  Repositório: {REPO_URL}")
    print("=" * 75)

    # 1. git init
    log_step(1, "Inicializando repositório Git local...")
    p1 = run_cmd(["git", "init"])
    log_ok(p1.stdout.strip() or "Git inicializado.")

    # 2. Definir branch principal 'main'
    log_step(2, "Configurando branch principal 'main'...")
    # checkout -B main cria ou troca para main garantindo o nome correto
    p2 = run_cmd(["git", "checkout", "-B", "main"])
    log_ok(p2.stderr.strip() or p2.stdout.strip() or "Branch 'main' ativa.")

    # 3. Configurar remote origin
    log_step(3, f"Configurando remote origin para {REPO_URL}...")
    p_remotes = run_cmd(["git", "remote"], check=False)
    if "origin" in p_remotes.stdout.split():
        run_cmd(["git", "remote", "set-url", "origin", REPO_URL])
        log_ok("Remote 'origin' atualizado com sucesso.")
    else:
        run_cmd(["git", "remote", "add", "origin", REPO_URL])
        log_ok("Remote 'origin' adicionado com sucesso.")

    # 4. git add . respeitando o .gitignore
    log_step(4, "Adicionando arquivos ao stage respeitando o .gitignore...")
    # Garante que nenhum .env foi adicionado por engano
    run_cmd(["git", "rm", "-r", "--cached", ".env"], check=False)
    run_cmd(["git", "rm", "-r", "--cached", "backend/.env"], check=False)
    run_cmd(["git", "add", "."])
    log_ok("Arquivos adicionados ao stage com blindagem SecOps.")

    # 5. git commit
    log_step(5, "Criando commit automático de deploy...")
    commit_msg = "Deploy Automático: Sistema Qconcursos Finalizado e Camuflado"
    p_status = run_cmd(["git", "status", "--porcelain"])
    if p_status.stdout.strip():
        p_commit = run_cmd(["git", "commit", "-m", commit_msg])
        log_ok(f"Commit realizado com sucesso:\n{p_commit.stdout.strip()}")
    else:
        log_ok("Nenhuma alteração pendente; commit anterior mantido.")

    # 6. git push -u origin main --force
    log_step(6, "Enviando código para o GitHub (git push -u origin main --force)...")
    try:
        p_push = run_cmd(["git", "push", "-u", "origin", "main", "--force"])
        print(p_push.stdout)
        if p_push.stderr:
            print(p_push.stderr)
        print("=" * 75)
        print("  🎉 PUBLICAÇÃO NO GITHUB CONCLUÍDA COM SUCESSO TOTAL!")
        print("=" * 75)
        print(f"Repositório ativo: {REPO_URL}")
        print("\nPara ativar o Deploy na Render:")
        print("1. Acesse https://dashboard.render.com/select-repo?type=blueprint")
        print("2. Selecione o repositório 'lucasmoraesreis/CONCURSOS'")
        print("3. O arquivo 'render.yaml' provisionará automaticamente o Banco, Backend e Frontend!")
    except subprocess.CalledProcessError as e:
        log_err(f"Falha ao realizar o push:\n{e.stderr or e.stdout}")
        print("\n💡 Caso o GitHub exija autenticação (Git Credential Manager ou SSH), execute:")
        print(f"   git push -u origin main --force")
        sys.exit(e.returncode)


if __name__ == "__main__":
    main()
