"""
Router: Questões

Endpoints:
  GET  /api/questoes                — Busca questões com filtros + paginação (CORRIGIDO)
  GET  /api/questoes/busca-semantica — Busca por similaridade semântica (pgvector)
  POST /api/questoes/gerar-inedita  — Gera questão inédita com IA (Hacker de Bancas)

Code Review Fixes:
  - Query de contagem unificada (não duplica JOINs)
  - ILIKE com sanitização contra wildcards
  - Tratamento de erros com HTTPException
"""

import re
from uuid import UUID
from fastapi import APIRouter, Depends, Query as QueryParam, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.database import get_db
from src.models import Questao, Prova, Concurso, Banca
from src.schemas import QuestaoResponse, QuestoesListResponse

router = APIRouter(prefix="/api", tags=["Questões"])


def _sanitize_like(value: str) -> str:
    """Escapa caracteres especiais do LIKE/ILIKE para evitar wildcards indesejados."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _build_questoes_base_query(
    concurso_id: UUID | None,
    disciplina_id: UUID | None,
    assunto_id: UUID | None,
    banca_id: UUID | None,
    tipo_questao: str | None,
    search: str | None,
):
    """
    Constrói a query base com filtros — usada tanto para contagem quanto para listagem.
    FIX: elimina duplicação de lógica de filtro (Code Review item #1).
    """
    conditions = []

    if concurso_id:
        conditions.append(Prova.concurso_id == concurso_id)
    if disciplina_id:
        conditions.append(Questao.disciplina_id == disciplina_id)
    if assunto_id:
        conditions.append(Questao.assunto_id == assunto_id)
    if banca_id:
        conditions.append(Concurso.banca_id == banca_id)
    if tipo_questao:
        conditions.append(Questao.tipo_questao == tipo_questao)
    if search:
        safe_search = _sanitize_like(search)
        conditions.append(Questao.enunciado.ilike(f"%{safe_search}%"))

    return conditions


@router.get("/questoes", response_model=QuestoesListResponse)
async def list_questoes(
    concurso_id: UUID | None = QueryParam(None, description="Filtrar por concurso"),
    disciplina_id: UUID | None = QueryParam(None, description="Filtrar por disciplina"),
    assunto_id: UUID | None = QueryParam(None, description="Filtrar por assunto"),
    banca_id: UUID | None = QueryParam(None, description="Filtrar por banca"),
    tipo_questao: str | None = QueryParam(None, description="'Múltipla Escolha' ou 'Certo/Errado'"),
    search: str | None = QueryParam(None, description="Busca textual no enunciado"),
    page: int = QueryParam(1, ge=1),
    limit: int = QueryParam(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Lista questões com filtros compostos e paginação."""

    conditions = _build_questoes_base_query(
        concurso_id, disciplina_id, assunto_id, banca_id, tipo_questao, search
    )

    # Query base com JOINs (uma única vez)
    base = (
        select(Questao)
        .join(Prova, Questao.prova_id == Prova.id)
        .join(Concurso, Prova.concurso_id == Concurso.id)
        .join(Banca, Concurso.banca_id == Banca.id)
    )
    for cond in conditions:
        base = base.where(cond)

    # Contagem usando subquery da mesma base (FIX: sem duplicação)
    count_query = select(func.count()).select_from(
        base.with_only_columns(Questao.id).subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Query paginada com eager loading
    query = (
        base
        .options(
            selectinload(Questao.alternativas),
            selectinload(Questao.disciplina),
            selectinload(Questao.assunto),
            selectinload(Questao.prova)
                .selectinload(Prova.concurso)
                .selectinload(Concurso.banca),
        )
        .order_by(Questao.numero_questao)
        .offset((page - 1) * limit)
        .limit(limit)
    )

    result = await db.execute(query)
    questoes = result.scalars().unique().all()

    items = [_questao_to_response(q) for q in questoes]

    return QuestoesListResponse(total=total, page=page, limit=limit, items=items)


# =============================================
# BUSCA SEMÂNTICA (pgvector)
# =============================================

from src.schemas import (
    QuestaoResponse,
    QuestoesListResponse,
    BuscaSemanticaResponse,
    GerarIneditaRequest,
    QuestaoGeradaResponse,
)
from src.services.generator_service import QuestionGeneratorService
from src.services.cost_auditor import AICostAuditor


@router.get("/questoes/busca-semantica", response_model=BuscaSemanticaResponse)
async def busca_semantica(
    query_text: str = QueryParam(..., alias="q", min_length=3, description="Termo de busca semântica"),
    limit: int = QueryParam(20, ge=1, le=50),
    concurso_id: UUID | None = QueryParam(None),
    disciplina_id: UUID | None = QueryParam(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Busca Semântica — encontra questões por significado, não apenas palavras exatas.

    1. Recebe o texto de busca do usuário
    2. Gera embedding via Gemini text-embedding-004
    3. Faz busca por similaridade de cosseno (cosine distance) no pgvector
    4. Retorna questões ordenadas por relevância
    """
    from google import genai
    import os

    # Gera embedding da query do usuário
    try:
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key or api_key in ("placeholder", "sua_chave_do_gemini_aqui", "SUA_CHAVE_AQUI"):
            raise HTTPException(
                status_code=503,
                detail="Serviço de IA indisponível: GEMINI_API_KEY não configurada no servidor."
            )
        client = genai.Client(api_key=api_key)
        result = client.models.embed_content(
            model="text-embedding-004",
            contents=query_text,
        )
        query_embedding = result.embeddings[0].values
        # Auditoria de tokens para busca semântica
        AICostAuditor.log_operation(
            operation="busca_semantica",
            model="text-embedding-004",
            prompt_tokens=max(1, len(query_text) // 4),
            completion_tokens=0,
            metadata={"query_length": len(query_text)},
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Erro ao gerar embedding: {str(e)}")

    # Monta vetor como string para pgvector
    vec_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    # Query SQL nativa com pgvector — busca por cosseno
    # 1 - (cosine_distance) = cosine_similarity
    sql = """
        SELECT
            q.id,
            1 - (q.embedding <=> :vec::vector) AS similarity
        FROM questoes q
        JOIN provas p ON q.prova_id = p.id
        JOIN concursos c ON p.concurso_id = c.id
        WHERE q.embedding IS NOT NULL
    """
    params = {"vec": vec_str}

    # Filtros opcionais
    if concurso_id:
        sql += " AND p.concurso_id = :concurso_id"
        params["concurso_id"] = str(concurso_id)
    if disciplina_id:
        sql += " AND q.disciplina_id = :disciplina_id"
        params["disciplina_id"] = str(disciplina_id)

    sql += " ORDER BY q.embedding <=> :vec2::vector LIMIT :limit"
    params["vec2"] = vec_str
    params["limit"] = limit

    db_result = await db.execute(text(sql), params)
    rows = db_result.fetchall()

    if not rows:
        return BuscaSemanticaResponse(items=[], total=0, query=query_text)

    questao_ids = [row.id for row in rows]
    similarity_map = {row.id: row.similarity for row in rows}

    full_query = (
        select(Questao)
        .where(Questao.id.in_(questao_ids))
        .options(
            selectinload(Questao.alternativas),
            selectinload(Questao.disciplina),
            selectinload(Questao.assunto),
            selectinload(Questao.prova)
                .selectinload(Prova.concurso)
                .selectinload(Concurso.banca),
        )
    )
    full_result = await db.execute(full_query)
    questoes_map = {item.id: item for item in full_result.scalars().unique().all()}

    # Mantém a ordem exata de similaridade do pgvector
    items = []
    for qid in questao_ids:
        q_obj = questoes_map.get(qid)
        if q_obj:
            items.append(_questao_to_response(q_obj, similarity=similarity_map.get(qid)))

    return BuscaSemanticaResponse(items=items, total=len(items), query=query_text)


# =============================================
# GERADOR DE QUESTÕES INÉDITAS (Hacker de Bancas)
# =============================================

@router.post("/questoes/gerar-inedita", response_model=QuestaoGeradaResponse)
async def gerar_questao_inedita(
    request: GerarIneditaRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Gera uma questão inédita emulando o estilo de uma banca específica.

    O "Hacker de Bancas" analisa padrões históricos de pegadinhas,
    gera a questão via Structured Outputs do Gemini, persiste no banco
    e indexa no pgvector.
    """
    try:
        service = QuestionGeneratorService()
        return await service.generate_question(
            banca=request.banca,
            disciplina=request.disciplina,
            assunto=request.assunto,
            tipo_questao=request.tipo_questao,
            dificuldade=request.dificuldade,
            db=db,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar questão inédita: {str(e)}")


# =============================================
# HELPER
# =============================================

def _questao_to_response(q: Questao, similarity: float | None = None) -> QuestaoResponse:
    """Converte um ORM Questao em QuestaoResponse com enriquecimento de IA."""
    concurso = q.prova.concurso if q.prova else None
    meta = getattr(q, "extra_metadata", None) or {}
    pegadinha = meta.get("engenharia_da_pegadinha") if isinstance(meta, dict) else None

    return QuestaoResponse(
        id=q.id,
        numero_questao=q.numero_questao,
        tipo_questao=q.tipo_questao,
        enunciado=q.enunciado,
        alternativa_correta=q.alternativa_correta,
        justificativa_ia=q.justificativa_ia,
        alternativas=[
            {
                "id": a.id,
                "letra": a.letra,
                "texto": a.texto,
                "is_correta": a.is_correta,
            }
            for a in sorted(q.alternativas, key=lambda x: x.letra)
        ],
        disciplina_nome=q.disciplina.nome if q.disciplina else None,
        assunto_nome=q.assunto.nome if q.assunto else None,
        concurso_orgao=concurso.orgao if concurso else None,
        concurso_cargo=concurso.cargo if concurso else None,
        concurso_ano=concurso.ano if concurso else None,
        banca_nome=concurso.banca.nome if concurso and concurso.banca else None,
        is_inedita=getattr(q, "is_inedita", False),
        engenharia_da_pegadinha=pegadinha,
        similarity=round(float(similarity), 4) if similarity is not None else None,
    )
