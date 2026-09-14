"""user_performance_schema: Create usuarios, historico_respostas and desempenho_materia

Revision ID: 003_user_performance_schema
Revises: 002_update_schema
Create Date: 2026-09-14 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003_user_performance_schema'
down_revision: Union[str, None] = '002_update_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tabela USUARIOS
    op.create_table(
        'usuarios',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('nome', sa.String(150), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('senha_hash', sa.String(255), nullable=False),
        sa.Column('plano_assinatura', sa.String(20), nullable=False, server_default='FREE'),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("plano_assinatura IN ('FREE', 'PREMIUM')", name='ck_usuario_plano'),
    )
    op.create_index('idx_usuarios_email', 'usuarios', ['email'], unique=True)

    # 2. Tabela HISTORICO_RESPOSTAS
    op.create_table(
        'historico_respostas',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('questao_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('questoes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('alternativa_marcada', sa.CHAR(1), nullable=False),
        sa.Column('foi_correta', sa.Boolean(), nullable=False),
        sa.Column('tempo_segundos', sa.Integer(), server_default='0', nullable=False),
        sa.Column('respondido_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('idx_historico_usuario', 'historico_respostas', ['usuario_id'])
    op.create_index('idx_historico_questao', 'historico_respostas', ['questao_id'])
    op.create_index('idx_historico_usuario_data', 'historico_respostas', ['usuario_id', 'respondido_em'])

    # 3. Tabela Agregada / Cache de DESEMPENHO_MATERIA
    op.create_table(
        'desempenho_materia',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('disciplina_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('disciplinas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assunto_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assuntos.id', ondelete='SET NULL'), nullable=True),
        sa.Column('total_questoes_respondidas', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_acertos', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_erros', sa.Integer(), server_default='0', nullable=False),
        sa.Column('taxa_acerto_pct', sa.Numeric(5, 2), server_default='0.00', nullable=False),
        sa.Column('tempo_medio_segundos', sa.Numeric(6, 2), server_default='0.00', nullable=False),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('usuario_id', 'disciplina_id', 'assunto_id', name='uq_usuario_desempenho_materia'),
    )
    op.create_index('idx_desempenho_usuario_disc', 'desempenho_materia', ['usuario_id', 'disciplina_id'])

    # 4. View de agregação dinâmica em tempo real
    op.execute("""
        CREATE OR REPLACE VIEW view_desempenho_materia AS
        SELECT
            hr.usuario_id,
            q.disciplina_id,
            d.nome AS disciplina_nome,
            q.assunto_id,
            a.nome AS assunto_nome,
            COUNT(hr.id) AS total_respostas,
            COUNT(hr.id) FILTER (WHERE hr.foi_correta = TRUE) AS total_acertos,
            COUNT(hr.id) FILTER (WHERE hr.foi_correta = FALSE) AS total_erros,
            ROUND((COUNT(hr.id) FILTER (WHERE hr.foi_correta = TRUE)::numeric / NULLIF(COUNT(hr.id), 0)) * 100, 2) AS taxa_acerto_pct,
            ROUND(AVG(hr.tempo_segundos), 1) AS tempo_medio_segundos,
            MAX(hr.respondido_em) AS ultima_resposta_em
        FROM historico_respostas hr
        JOIN questoes q ON hr.questao_id = q.id
        LEFT JOIN disciplinas d ON q.disciplina_id = d.id
        LEFT JOIN assuntos a ON q.assunto_id = a.id
        GROUP BY hr.usuario_id, q.disciplina_id, d.nome, q.assunto_id, a.nome;
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS view_desempenho_materia;")
    op.drop_table('desempenho_materia')
    op.drop_table('historico_respostas')
    op.drop_table('usuarios')
