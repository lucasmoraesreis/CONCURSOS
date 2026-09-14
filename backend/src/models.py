"""
Modelos SQLAlchemy ORM para o backend (async-compatible).
Reutiliza a mesma estrutura do pipeline.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Text, Boolean, DateTime, ForeignKey,
    CheckConstraint, UniqueConstraint, JSON, CHAR
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Banca(Base):
    __tablename__ = "bancas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    site_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    concursos = relationship("Concurso", back_populates="banca", lazy="selectin")


class Concurso(Base):
    __tablename__ = "concursos"
    __table_args__ = (
        UniqueConstraint("banca_id", "orgao", "cargo", "ano", name="uq_concurso_identidade"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    banca_id = Column(UUID(as_uuid=True), ForeignKey("bancas.id", ondelete="CASCADE"), nullable=False)
    orgao = Column(String(200), nullable=False)
    cargo = Column(String(300), nullable=False)
    ano = Column(Integer, nullable=False)
    nivel = Column(String(20), nullable=False)
    edital_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    banca = relationship("Banca", back_populates="concursos", lazy="selectin")
    provas = relationship("Prova", back_populates="concurso", lazy="selectin")


class Prova(Base):
    __tablename__ = "provas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    concurso_id = Column(UUID(as_uuid=True), ForeignKey("concursos.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(50), default="objetiva")
    pdf_url = Column(String(500))
    pdf_path_local = Column(String(500))
    gabarito_url = Column(String(500))
    gabarito_path_local = Column(String(500))
    status = Column(String(30), default="pendente")
    total_questoes = Column(Integer, default=0)
    processed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    concurso = relationship("Concurso", back_populates="provas")
    questoes = relationship("Questao", back_populates="prova", lazy="selectin")


class Disciplina(Base):
    __tablename__ = "disciplinas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False, unique=True)
    slug = Column(String(200), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    assuntos = relationship("Assunto", back_populates="disciplina", lazy="selectin")
    questoes = relationship("Questao", back_populates="disciplina")


class Assunto(Base):
    __tablename__ = "assuntos"
    __table_args__ = (
        UniqueConstraint("disciplina_id", "slug", name="uq_assunto_disciplina_slug"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    disciplina_id = Column(UUID(as_uuid=True), ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False)
    nome = Column(String(300), nullable=False)
    slug = Column(String(300), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    disciplina = relationship("Disciplina", back_populates="assuntos")
    questoes = relationship("Questao", back_populates="assunto")


class Questao(Base):
    __tablename__ = "questoes"
    __table_args__ = (
        UniqueConstraint("prova_id", "numero_questao", name="uq_questao_prova_numero"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prova_id = Column(UUID(as_uuid=True), ForeignKey("provas.id", ondelete="CASCADE"), nullable=False)
    disciplina_id = Column(UUID(as_uuid=True), ForeignKey("disciplinas.id", ondelete="SET NULL"))
    assunto_id = Column(UUID(as_uuid=True), ForeignKey("assuntos.id", ondelete="SET NULL"))
    numero_questao = Column(Integer, nullable=False)
    tipo_questao = Column(String(30), nullable=False)
    enunciado = Column(Text, nullable=False)
    alternativa_correta = Column(String(5))
    justificativa_ia = Column(Text)
    is_inedita = Column(Boolean, default=False, nullable=False)
    extra_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    prova = relationship("Prova", back_populates="questoes")
    disciplina = relationship("Disciplina", back_populates="questoes", lazy="selectin")
    assunto = relationship("Assunto", back_populates="questoes", lazy="selectin")
    alternativas = relationship("Alternativa", back_populates="questao", lazy="selectin")


class Alternativa(Base):
    __tablename__ = "alternativas"
    __table_args__ = (
        UniqueConstraint("questao_id", "letra", name="uq_alternativa_questao_letra"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    questao_id = Column(UUID(as_uuid=True), ForeignKey("questoes.id", ondelete="CASCADE"), nullable=False)
    letra = Column(CHAR(1), nullable=False)
    texto = Column(Text, nullable=False)
    is_correta = Column(Boolean, default=False)
    questao = relationship("Questao", back_populates="alternativas")


# ==============================================================================
# MODELOS DA FASE 2: USUÁRIOS E DESEMPENHO
# ==============================================================================

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    senha_hash = Column(String(255), nullable=False)
    plano_assinatura = Column(String(20), nullable=False, default="FREE")
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    respostas = relationship("HistoricoResposta", back_populates="usuario", cascade="all, delete-orphan")
    desempenhos = relationship("DesempenhoMateria", back_populates="usuario", cascade="all, delete-orphan")


class HistoricoResposta(Base):
    __tablename__ = "historico_respostas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    questao_id = Column(UUID(as_uuid=True), ForeignKey("questoes.id", ondelete="CASCADE"), nullable=False)
    alternativa_marcada = Column(CHAR(1), nullable=False)
    foi_correta = Column(Boolean, nullable=False)
    tempo_segundos = Column(Integer, default=0, nullable=False)
    respondido_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    usuario = relationship("Usuario", back_populates="respostas")
    questao = relationship("Questao")


class DesempenhoMateria(Base):
    __tablename__ = "desempenho_materia"
    __table_args__ = (
        UniqueConstraint("usuario_id", "disciplina_id", "assunto_id", name="uq_usuario_desempenho_materia"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    disciplina_id = Column(UUID(as_uuid=True), ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False)
    assunto_id = Column(UUID(as_uuid=True), ForeignKey("assuntos.id", ondelete="SET NULL"), nullable=True)
    total_questoes_respondidas = Column(Integer, default=0, nullable=False)
    total_acertos = Column(Integer, default=0, nullable=False)
    total_erros = Column(Integer, default=0, nullable=False)
    taxa_acerto_pct = Column(String(10), default="0.00", nullable=False)
    tempo_medio_segundos = Column(String(10), default="0.00", nullable=False)
    atualizado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    usuario = relationship("Usuario", back_populates="desempenhos")
    disciplina = relationship("Disciplina")
    assunto = relationship("Assunto")
