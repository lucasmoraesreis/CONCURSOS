"""
Modelos SQLAlchemy ORM mapeando o schema PostgreSQL.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Text, Boolean, DateTime, ForeignKey, CheckConstraint,
    UniqueConstraint, JSON, CHAR
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

    # Relacionamentos
    concursos = relationship("Concurso", back_populates="banca", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Banca(nome='{self.nome}')>"


class Concurso(Base):
    __tablename__ = "concursos"
    __table_args__ = (
        UniqueConstraint("banca_id", "orgao", "cargo", "ano", name="uq_concurso_identidade"),
        CheckConstraint("ano >= 2000 AND ano <= 2030", name="ck_concurso_ano"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    banca_id = Column(UUID(as_uuid=True), ForeignKey("bancas.id", ondelete="CASCADE"), nullable=False)
    orgao = Column(String(200), nullable=False)
    cargo = Column(String(300), nullable=False)
    ano = Column(Integer, nullable=False)
    nivel = Column(String(20), nullable=False)
    edital_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    banca = relationship("Banca", back_populates="concursos")
    provas = relationship("Prova", back_populates="concurso", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Concurso(orgao='{self.orgao}', cargo='{self.cargo}', ano={self.ano})>"

    @property
    def label(self) -> str:
        return f"{self.orgao} - {self.cargo} - {self.ano}"


class Prova(Base):
    __tablename__ = "provas"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pendente', 'baixado', 'extraido', 'processado', 'erro')",
            name="ck_prova_status"
        ),
    )

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

    # Relacionamentos
    concurso = relationship("Concurso", back_populates="provas")
    questoes = relationship("Questao", back_populates="prova", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Prova(concurso_id='{self.concurso_id}', status='{self.status}')>"


class Disciplina(Base):
    __tablename__ = "disciplinas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(200), nullable=False, unique=True)
    slug = Column(String(200), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    assuntos = relationship("Assunto", back_populates="disciplina", cascade="all, delete-orphan")
    questoes = relationship("Questao", back_populates="disciplina")

    def __repr__(self):
        return f"<Disciplina(nome='{self.nome}')>"


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

    # Relacionamentos
    disciplina = relationship("Disciplina", back_populates="assuntos")
    questoes = relationship("Questao", back_populates="assunto")

    def __repr__(self):
        return f"<Assunto(nome='{self.nome}')>"


class Questao(Base):
    __tablename__ = "questoes"
    __table_args__ = (
        UniqueConstraint("prova_id", "numero_questao", name="uq_questao_prova_numero"),
        CheckConstraint(
            "tipo_questao IN ('Múltipla Escolha', 'Certo/Errado')",
            name="ck_questao_tipo"
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prova_id = Column(UUID(as_uuid=True), ForeignKey("provas.id", ondelete="CASCADE"), nullable=False)
    disciplina_id = Column(UUID(as_uuid=True), ForeignKey("disciplinas.id", ondelete="SET NULL"), nullable=True)
    assunto_id = Column(UUID(as_uuid=True), ForeignKey("assuntos.id", ondelete="SET NULL"), nullable=True)
    numero_questao = Column(Integer, nullable=False)
    tipo_questao = Column(String(30), nullable=False)
    enunciado = Column(Text, nullable=False)
    alternativa_correta = Column(String(5))
    justificativa_ia = Column(Text)
    is_inedita = Column(Boolean, default=False, nullable=False)
    extra_metadata = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    prova = relationship("Prova", back_populates="questoes")
    disciplina = relationship("Disciplina", back_populates="questoes")
    assunto = relationship("Assunto", back_populates="questoes")
    alternativas = relationship("Alternativa", back_populates="questao", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Questao(numero={self.numero_questao}, tipo='{self.tipo_questao}')>"


class Alternativa(Base):
    __tablename__ = "alternativas"
    __table_args__ = (
        UniqueConstraint("questao_id", "letra", name="uq_alternativa_questao_letra"),
        CheckConstraint("letra IN ('A', 'B', 'C', 'D', 'E')", name="ck_alternativa_letra"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    questao_id = Column(UUID(as_uuid=True), ForeignKey("questoes.id", ondelete="CASCADE"), nullable=False)
    letra = Column(CHAR(1), nullable=False)
    texto = Column(Text, nullable=False)
    is_correta = Column(Boolean, default=False)

    # Relacionamentos
    questao = relationship("Questao", back_populates="alternativas")

    def __repr__(self):
        return f"<Alternativa(letra='{self.letra}', correta={self.is_correta})>"
