"""update_schema: Add is_inedita and pgvector embedding to questoes

Revision ID: 002_update_schema
Revises: 001_initial_schema
Create Date: 2026-09-14 19:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_update_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ativar extensão pgvector
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Adicionar coluna is_inedita
    op.add_column(
        'questoes',
        sa.Column('is_inedita', sa.Boolean(), server_default=sa.text('false'), nullable=False)
    )

    # 3. Adicionar coluna embedding (768 dimensões)
    op.execute("ALTER TABLE questoes ADD COLUMN IF NOT EXISTS embedding vector(768);")

    # 4. Índice HNSW para busca por similaridade de cosseno
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_questoes_embedding_hnsw
        ON questoes USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    """)

    # 5. Índice composto de alta performance para filtros em cascata
    op.create_index(
        'idx_questoes_filtro_cascata',
        'questoes',
        ['prova_id', 'disciplina_id', 'assunto_id'],
        unique=False
    )
    op.create_index(
        'idx_questoes_is_inedita',
        'questoes',
        ['is_inedita'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('idx_questoes_is_inedita', table_name='questoes')
    op.drop_index('idx_questoes_filtro_cascata', table_name='questoes')
    op.execute("DROP INDEX IF EXISTS idx_questoes_embedding_hnsw;")
    op.execute("ALTER TABLE questoes DROP COLUMN IF EXISTS embedding;")
    op.drop_column('questoes', 'is_inedita')
