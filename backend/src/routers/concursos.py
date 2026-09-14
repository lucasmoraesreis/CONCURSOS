"""
Router: Concursos

Endpoints:
  GET /api/concursos — Lista todos os concursos (com filtros por banca e ano)
  GET /api/bancas     — Lista todas as bancas
"""

from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.database import get_db
from src.models import Concurso, Banca
from src.schemas import ConcursoResponse, ConcursoListResponse, BancaResponse

router = APIRouter(prefix="/api", tags=["Concursos"])


@router.get("/bancas", response_model=list[BancaResponse])
async def list_bancas(db: AsyncSession = Depends(get_db)):
    """Lista todas as bancas cadastradas."""
    result = await db.execute(
        select(Banca).order_by(Banca.nome)
    )
    bancas = result.scalars().all()
    return bancas


@router.get("/concursos", response_model=ConcursoListResponse)
async def list_concursos(
    banca_id: UUID | None = Query(None, description="Filtrar por banca"),
    ano: int | None = Query(None, description="Filtrar por ano"),
    search: str | None = Query(None, description="Busca por órgão ou cargo"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """
    Lista concursos com filtros opcionais.
    Retorna concursos ordenados por ano (mais recente primeiro).
    """
    query = select(Concurso).options(selectinload(Concurso.banca))

    # Filtros
    if banca_id:
        query = query.where(Concurso.banca_id == banca_id)
    if ano:
        query = query.where(Concurso.ano == ano)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            Concurso.orgao.ilike(search_term) | Concurso.cargo.ilike(search_term)
        )

    # Contagem total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginação
    query = query.order_by(Concurso.ano.desc(), Concurso.orgao)
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    concursos = result.scalars().all()

    items = [
        ConcursoResponse(
            id=c.id,
            orgao=c.orgao,
            cargo=c.cargo,
            ano=c.ano,
            nivel=c.nivel,
            banca_nome=c.banca.nome if c.banca else "",
            label=f"{c.orgao} - {c.cargo} - {c.ano}",
        )
        for c in concursos
    ]

    return ConcursoListResponse(total=total, items=items)
