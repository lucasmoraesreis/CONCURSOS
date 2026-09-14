"""
Script de Verificação de Saúde da Infraestrutura e Conectividade IA.
Valida PostgreSQL (pgvector) e Google Gemini (Embeddings + Structured Outputs).
"""

import sys
import time
from pathlib import Path
from pydantic import BaseModel, Field

# Assegura que o diretório pipeline esteja no sys.path
PIPELINE_DIR = Path(__file__).resolve().parent.parent.parent
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

from sqlalchemy import text
from loguru import logger

from src.config import settings
from src.database import get_session
from src.llm.client import get_gemini_client


# Schema mínimo para validação de Structured Output
class HealthCheckQuestionSchema(BaseModel):
    enunciado: str = Field(description="Enunciado conciso de teste")
    resposta_correta: str = Field(description="Resposta ou letra correta")
    status_ia: str = Field(description="Deve ser 'OPERACIONAL'")


def check_database() -> bool:
    """Verifica conectividade com PostgreSQL e status da extensão pgvector."""
    print("\n" + "=" * 60)
    print("🔍 [1/3] VERIFICANDO BANCO DE DADOS (POSTGRESQL + PGVECTOR)")
    print("=" * 60)

    start_time = time.time()
    session = None
    try:
        session = get_session()
        # 1. Teste de ping básico
        result = session.execute(text("SELECT version();")).scalar()
        elapsed = (time.time() - start_time) * 1000
        print(f"✅ Conexão PostgreSQL: OK ({elapsed:.1f}ms)")
        print(f"   Versão: {result.split(',')[0] if result else 'N/A'}")

        # 2. Teste da extensão pgvector
        ext_check = session.execute(
            text("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
        ).fetchone()

        if ext_check:
            print(f"✅ Extensão pgvector: ATIVA (versão {ext_check[1]})")
        else:
            print("⚠️ Extensão pgvector: NÃO ENCONTRADA. Tentando ativar...")
            session.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            session.commit()
            print("✅ Extensão pgvector ativada com sucesso!")

        # 3. Teste de operação vetorial
        vec_test = session.execute(
            text("SELECT '[1,2,3]'::vector <=> '[1,2,4]'::vector AS dist;")
        ).scalar()
        print(f"✅ Cálculo de Distância Vetorial pgvector: OK (dist={vec_test:.4f})")
        return True

    except Exception as e:
        print(f"❌ Falha no Banco de Dados: {e}")
        return False
    finally:
        if session:
            session.close()


def check_gemini_embedding() -> bool:
    """Valida o modelo text-embedding-004 do Google Gemini."""
    print("\n" + "=" * 60)
    print("🔍 [2/3] VERIFICANDO GEMINI: EMBEDDINGS VETORIAIS (text-embedding-004)")
    print("=" * 60)

    start_time = time.time()
    try:
        client = get_gemini_client()
        test_text = "Verificação de sanidade do sistema de busca semântica de concursos públicos."

        response = client.models.embed_content(
            model="text-embedding-004",
            contents=test_text,
        )

        elapsed = (time.time() - start_time) * 1000
        emb_values = response.embeddings[0].values
        dim = len(emb_values)

        if dim == 768:
            print(f"✅ Geração de Embedding: OK ({elapsed:.1f}ms)")
            print(f"   Dimensões do vetor: {dim} (Padrão Gemini text-embedding-004)")
            print(f"   Amostra do vetor: [{emb_values[0]:.4f}, {emb_values[1]:.4f}, ...]")
            return True
        else:
            print(f"⚠️ Dimensões inesperadas: {dim} (esperado: 768)")
            return False

    except Exception as e:
        print(f"❌ Falha ao gerar embedding com Gemini: {e}")
        return False


def check_gemini_structured_output() -> bool:
    """Valida chamadas Structured Output (JSON Schema com Pydantic) do Gemini."""
    print("\n" + "=" * 60)
    print("🔍 [3/3] VERIFICANDO GEMINI: STRUCTURED OUTPUTS (Pydantic)")
    print("=" * 60)

    start_time = time.time()
    try:
        client = get_gemini_client()
        from google.genai import types
        import json

        config = types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=300,
            system_instruction="Você é um assistente de health check técnico de IA.",
            response_mime_type="application/json",
            response_schema=HealthCheckQuestionSchema,
        )

        prompt = "Gere um registro confirmando status 'OPERACIONAL' com um exemplo sintético de questão."

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=config,
        )

        elapsed = (time.time() - start_time) * 1000
        data = json.loads(response.text)
        validated = HealthCheckQuestionSchema(**data)

        print(f"✅ Chamada Structured Output: OK ({elapsed:.1f}ms)")
        print(f"   Modelo utilizado: {settings.gemini_model}")
        print(f"   Status retornado: {validated.status_ia}")
        print(f"   Enunciado de teste: \"{validated.enunciado}\"")
        return True

    except Exception as e:
        print(f"❌ Falha no Structured Output do Gemini: {e}")
        return False


def run_health_check() -> int:
    """Executa todos os checks e retorna exit code (0 se todos passarem)."""
    print("\n" + "🚀" * 30)
    print("   SISTEMA DE QUESTÕES — HEALTH CHECK DE INFRAESTRUTURA & IA")
    print("🚀" * 30)

    db_ok = check_database()
    emb_ok = check_gemini_embedding()
    llm_ok = check_gemini_structured_output()

    print("\n" + "=" * 60)
    print("📊 RESUMO FINAL DE SAÚDE DO SISTEMA")
    print("=" * 60)
    print(f"• Banco PostgreSQL + pgvector:  {'✅ OPERACIONAL' if db_ok else '❌ FALHOU'}")
    print(f"• Gemini Embeddings (768d):     {'✅ OPERACIONAL' if emb_ok else '❌ FALHOU'}")
    print(f"• Gemini Structured Outputs:    {'✅ OPERACIONAL' if llm_ok else '❌ FALHOU'}")
    print("=" * 60)

    if db_ok and emb_ok and llm_ok:
        print("\n✨ TODOS OS SISTEMAS ESTÃO 100% OPERACIONAIS E PRONTOS PARA EXECUÇÃO!\n")
        return 0
    else:
        print("\n❌ ALGUNS COMPONENTES APRESENTAM FALHAS. Verifique as mensagens acima.\n")
        return 1


if __name__ == "__main__":
    sys.exit(run_health_check())
