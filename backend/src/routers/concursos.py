"""
Router: Concursos

Endpoints:
  GET /api/concursos — Lista todos os concursos (com filtros por banca e ano)
  GET /api/bancas     — Lista todas as bancas
"""

from uuid import UUID
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.database import get_db
from src.models import Concurso, Banca
from src.schemas import ConcursoResponse, ConcursoListResponse, BancaResponse
from src.routers.questoes import _sanitize_like
from src.services.cache_service import cache_service

router = APIRouter(prefix="/api", tags=["Concursos"])


@router.get("/bancas", response_model=list[BancaResponse])
async def list_bancas(db: AsyncSession = Depends(get_db)):
    """Lista todas as bancas cadastradas com cache L1 para hiperescala."""
    cached = await cache_service.get("bancas:all")
    if cached is not None:
        return cached

    result = await db.execute(
        select(Banca).order_by(Banca.nome)
    )
    bancas = [BancaResponse.model_validate(b) for b in result.scalars().all()]
    await cache_service.set("bancas:all", bancas, ttl_seconds=600)
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
        safe_search = _sanitize_like(search.strip())
        search_term = f"%{safe_search}%"
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


# ==============================================================================
# INTEGRAÇÃO OFICIAL COM O PCI CONCURSOS (pciconcursos.com.br)
# ==============================================================================

@router.get("/concursos/pci/pesquisar")
async def pesquisar_pci_concursos(
    termo: str = Query(..., description="Termo de busca no PCI Concursos (ex: INSS, PF, TJ)"),
    uf: str | None = Query(None, description="Sigla do estado opcional (ex: sp, df, rj)"),
):
    """
    Pesquisa editais e certames abertos em tempo real através do servidor MCP oficial do PCI Concursos.
    """
    from src.services.pci_service import pci_service
    return pci_service.pesquisar_concursos(termo=termo, uf=uf)


@router.get("/concursos/pci/provas")
async def buscar_pci_provas(
    termo: str = Query(..., description="Termo de busca no acervo de provas do PCI Concursos"),
    limit: int = Query(20, ge=1, le=50, description="Limite de resultados"),
):
    """
    Pesquisa no repositório de 268.000+ provas para download do PCI Concursos.
    Retorna provas e cadernos disponíveis.
    """
    from src.services.pci_service import pci_service
    provas = pci_service.buscar_provas_acervo(termo=termo, limit=limit)
    return {
        "termo": termo,
        "total": len(provas),
        "provas": provas,
        "fonte": "https://www.pciconcursos.com.br/provas/",
    }


class PCICrawlRequest(BaseModel):
    disciplinas: list[str] | None = None
    max_paginas: int = 2
    max_subcategorias: int = 3


@router.post("/concursos/pci/varrer")
async def varrer_pci_concursos(
    body: PCICrawlRequest | None = None,
):
    """
    Varre o portal PCI Concursos (pciconcursos.com.br) para capturar e ingerir
    novas questões reais diretamente no banco de dados da plataforma.
    """
    from src.services.pci_service import pci_service
    disciplinas = body.disciplinas if body else None
    max_pag = body.max_paginas if body else 2
    max_subs = body.max_subcategorias if body else 3

    result = pci_service.varrer_e_importar_questoes(
        disciplinas=disciplinas,
        max_paginas=max_pag,
        max_subcategorias=max_subs,
    )
    return {
        "status": "sucesso",
        "mensagem": f"Varredura do PCI Concursos concluída: {result['total_adicionadas']} novas questões adicionadas!",
        "detalhes": result,
    }


