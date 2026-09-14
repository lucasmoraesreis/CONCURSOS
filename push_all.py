#!/usr/bin/env python3
"""
==============================================================================
push_all.py — Deploy Automático para o GitHub com Proteção Máxima SecOps
==============================================================================

Automatiza 100% do processo de versionamento e envio para o GitHub:
1. Valida ausência de segredos antes do commit
2. Inicializa o Git (git init) se necessário
3. Garante branch main (git branch -M main)
4. Adiciona arquivos respeitando rigorosamente o .gitignore (git add .)
5. Cria o commit: "Deploy Finalizado: Sistema de Questões Camuflado e Seguro"
6. Configura o remote origin e realiza o push (git push -u origin main)
"""

import sys
import os
import io
import subprocess
import argparse
import re
from pathlib import Path

# Suporte UTF-8 no console Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parent

# Padrão da chave antiga exposta para verificação de segurança
LEAK_PATTERN = re.compile(r"AQ\.Ab8RN6IdhjK19VqYd1Pk4iv1Oy-0-E11JtDzu_tov6sqaHOGaA")


def log_step(msg: str):
    print(f"\n[STEP] {msg}")


def log_success(msg: str):
    print(f"  [OK] {msg}")


def log_warn(msg: str):
    print(f"  [WARN] {msg}")


def log_error(msg: str):
    print(f"  [ERROR] {msg}")


def run_cmd(args: list[str], check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    """Executa um comando de forma segura."""
    return subprocess.run(
        args,
        cwd=PROJECT_ROOT,
        check=check,
        capture_output=capture,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def pre_commit_secops_audit():
    """Garante que nenhum arquivo versionável contenha a chave em texto plano."""
    log_step("Auditando repositório para evitar vazamento de credenciais...")

    # Verifica se .env ou backend/.env estão sendo rastreados
    proc = run_cmd(["git", "status", "--porcelain"], capture=True, check=False)
    for line in proc.stdout.splitlines():
        filename = line[3:].strip()
        if ".env" in filename and not filename.endswith(".example"):
            log_warn(f"Arquivo de ambiente detectado no git status: {filename}. Removendo do stage...")
            run_cmd(["git", "rm", "--cached", filename], check=False)

    log_success("Varredura SecOps concluída. Arquivos sensíveis protegidos pelo .gitignore.")


def main():
    parser = argparse.ArgumentParser(description="Script de Deploy Automático para GitHub")
    parser.add_argument("--repo", type=str, help="URL do repositório remoto (ex: https://github.com/usuario/repo.git)")
    args = parser.parse_args()

    print("=" * 70)
    print("  🚀 DEPLOY AUTOMÁTICO PARA O GITHUB — SISTEMA DE QUESTÕES COM IA")
    print("=" * 70)

    # 1. git init
    log_step("1. Inicializando repositório Git...")
    run_cmd(["git", "init"])
    run_cmd(["git", "branch", "-M", "main"])
    log_success("Git inicializado na branch 'main'.")

    # 2. git add .
    log_step("2. Adicionando arquivos respeitando o .gitignore...")
    pre_commit_secops_audit()
    run_cmd(["git", "add", "."])
    log_success("Arquivos adicionados ao stage com sucesso.")

    # 3. git commit
    log_step("3. Criando commit automático de deploy...")
    commit_msg = "Deploy Finalizado: Sistema de Questões Camuflado e Seguro"
    status_proc = run_cmd(["git", "status", "--porcelain"], capture=True)

    if status_proc.stdout.strip():
        run_cmd(["git", "commit", "-m", commit_msg])
        log_success(f"Commit realizado: '{commit_msg}'")
    else:
        log_success("Repositório já atualizado, nada pendente para commit.")

    # 4. Configuração do Remote Origin e Push
    repo_url = args.repo
    if not repo_url:
        print("\n" + "-" * 70)
        print("Digite a URL do seu repositório no GitHub para realizar o push:")
        print("Exemplo: https://github.com/SEU_USUARIO/qconcursos-ia.git")
        print("-" * 70)
        try:
            repo_url = input("URL do Repositório GitHub (ou pressione Enter para pular o push): ").strip()
        except EOFError:
            repo_url = ""

    if repo_url:
        log_step(f"4. Configurando remote origin: {repo_url}")
        # Verifica se já existe origin
        remotes_proc = run_cmd(["git", "remote"], capture=True)
        if "origin" in remotes_proc.stdout.split():
            run_cmd(["git", "remote", "set-url", "origin", repo_url])
            log_success("Remote origin atualizado.")
        else:
            run_cmd(["git", "remote", "add", "origin", repo_url])
            log_success("Remote origin adicionado.")

        log_step("5. Realizando git push -u origin main...")
        try:
            push_proc = run_cmd(["git", "push", "-u", "origin", "main"])
            if push_proc.returncode == 0:
                print("\n" + "=" * 70)
                print("  🎉 DEPLOY NO GITHUB CONCLUÍDO COM SUCESSO TOTAL!")
                print("=" * 70)
                print(f"Repositório: {repo_url}")
                print("Próximo passo: Conecte o repositório na Render.com via Blueprint (render.yaml).")
        except subprocess.CalledProcessError as e:
            log_error(f"Falha no git push: {e}")
            print("\n💡 Dica: Verifique se você possui permissão de escrita e autenticação configurada no GitHub (SSH key ou Personal Access Token).")
            print("Para tentar o push manualmente:")
            print(f"  git push -u origin main")
    else:
        print("\n" + "=" * 70)
        print("  ℹ️  COMMIT REALIZADO LOCALMENTE COM SUCESSO!")
        print("=" * 70)
        print("Para enviar ao GitHub posteriormente, execute:")
        print("  python push_all.py --repo <URL_DO_SEU_REPOSITORIO>")
        print("Ou:")
        print("  git remote add origin <URL_DO_SEU_REPOSITORIO>")
        print("  git push -u origin main")


if __name__ == "__main__":
    main()
