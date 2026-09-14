"""
Script para gerar embeddings de todas as questões do banco.

Usa o modelo text-embedding-004 do Google Gemini para criar
vetores de 768 dimensões para cada enunciado de questão.

Uso:
    cd pipeline
    python -m src.scripts.generate_embeddings

Features:
- Processa apenas questões sem embedding (idempotente)
- Batch processing para eficiência
- Progresso com barra de progresso
- Commit incremental a cada batch
"""

from loguru import logger
from tqdm import tqdm
from sqlalchemy import text

from src.config import settings
from src.database import get_session, engine
from src.models import Questao
from src.llm.client import get_gemini_client, generate_embeddings_batch


def generate_all_embeddings(batch_size: int = 20):
    """
    Gera embeddings para todas as questões que ainda não possuem.
    """
    logger.info("=" * 60)
    logger.info("GERAÇÃO DE EMBEDDINGS — Busca Semântica")
    logger.info("=" * 60)

    session = get_session()
    client = get_gemini_client()

    try:
        # Conta questões sem embedding
        total_sem_embedding = session.query(Questao).filter(
            Questao.embedding.is_(None)
        ).count()

        if total_sem_embedding == 0:
            logger.info("✅ Todas as questões já possuem embeddings!")
            return

        logger.info(f"Questões sem embedding: {total_sem_embedding}")

        # Busca em lotes
        offset = 0
        total_processado = 0

        with tqdm(total=total_sem_embedding, desc="Gerando embeddings") as pbar:
            while offset < total_sem_embedding:
                questoes = session.query(Questao).filter(
                    Questao.embedding.is_(None)
                ).limit(batch_size).all()

                if not questoes:
                    break

                # Monta textos para embedding
                # Combina enunciado + alternativas para contexto mais rico
                texts = []
                for q in questoes:
                    alt_text = ""
                    if q.alternativas:
                        alt_text = " ".join(
                            f"{a.letra}) {a.texto}" for a in sorted(q.alternativas, key=lambda x: x.letra)
                        )
                    full_text = f"{q.enunciado} {alt_text}".strip()
                    texts.append(full_text)

                # Gera embeddings em batch
                embeddings = generate_embeddings_batch(client, texts)

                # Atualiza no banco usando SQL direto (pgvector)
                for q, emb in zip(questoes, embeddings):
                    # Converte lista de floats para formato pgvector
                    vec_str = "[" + ",".join(str(v) for v in emb) + "]"
                    session.execute(
                        text("UPDATE questoes SET embedding = :vec::vector WHERE id = :id"),
                        {"vec": vec_str, "id": str(q.id)},
                    )

                session.commit()
                total_processado += len(questoes)
                pbar.update(len(questoes))
                offset += batch_size

        logger.info(f"✅ Embeddings gerados: {total_processado} questões")

    except Exception as e:
        session.rollback()
        logger.error(f"❌ Erro ao gerar embeddings: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    logger.add(
        settings.pdf_dir.parent / "logs" / "embeddings_{time}.log",
        rotation="10 MB",
        level="INFO",
    )
    generate_all_embeddings()
