"""
Pydantic schemas para serialização de responses da API.
"""

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


# =============================================
# BANCA
# =============================================

class BancaResponse(BaseModel):
    id: UUID
    nome: str
    slug: str

    model_config = {"from_attributes": True}


# =============================================
# CONCURSO
# =============================================

class ConcursoResponse(BaseModel):
    id: UUID
    orgao: str
    cargo: str
    ano: int
    nivel: str
    banca_nome: str
    label: str  # "Órgão - Cargo - Ano"

    model_config = {"from_attributes": True}


class ConcursoListResponse(BaseModel):
    total: int
    items: list[ConcursoResponse]


# =============================================
# DISCIPLINA
# =============================================

class DisciplinaResponse(BaseModel):
    id: UUID
    nome: str
    slug: str
    total_questoes: int = 0

    model_config = {"from_attributes": True}


# =============================================
# ASSUNTO
# =============================================

class AssuntoResponse(BaseModel):
    id: UUID
    nome: str
    slug: str
    total_questoes: int = 0

    model_config = {"from_attributes": True}


# =============================================
# ALTERNATIVA
# =============================================

class AlternativaResponse(BaseModel):
    id: UUID
    letra: str
    texto: str
    is_correta: bool

    model_config = {"from_attributes": True}


# =============================================
# QUESTÃO
# =============================================

class QuestaoResponse(BaseModel):
    id: UUID
    numero_questao: int
    tipo_questao: str
    enunciado: str
    alternativa_correta: str | None
    justificativa_ia: str | None
    alternativas: list[AlternativaResponse]
    disciplina_nome: str | None = None
    assunto_nome: str | None = None
    concurso_orgao: str | None = None
    concurso_cargo: str | None = None
    concurso_ano: int | None = None
    banca_nome: str | None = None
    is_inedita: bool = False
    engenharia_da_pegadinha: str | None = None
    similarity: float | None = None

    model_config = {"from_attributes": True}


class QuestoesListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: list[QuestaoResponse]


# =============================================
# BUSCA SEMÂNTICA
# =============================================

class BuscaSemanticaResponse(BaseModel):
    items: list[QuestaoResponse]
    total: int
    query: str


# =============================================
# GERADOR DE QUESTÕES INÉDITAS (Hacker de Bancas)
# =============================================

class GerarIneditaRequest(BaseModel):
    banca: str
    disciplina: str
    assunto: str
    tipo_questao: str | None = "Múltipla Escolha"
    dificuldade: str | None = "Médio"


class QuestaoGeradaResponse(BaseModel):
    id: UUID | None = None
    tipo_questao: str
    enunciado: str
    alternativas: list[dict]
    alternativa_correta: str
    engenharia_da_pegadinha: str
    justificativa_ia: str
    banca_emulada: str
    disciplina: str
    assunto: str
    is_inedita: bool = True
