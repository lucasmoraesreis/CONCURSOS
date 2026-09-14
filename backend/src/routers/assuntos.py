"""
Router: Assuntos (Filtro Cascata — nível 3)

Endpoints:
  GET /api/disciplinas/{disciplina_id}/assuntos?concurso_id=...
    → Retorna assuntos de uma disciplina que possuem questões em um concurso específico.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models import Assunto, Questao, Prova
from src.schemas import AssuntoResponse

router = APIRouter(prefix="/api", tags=["Assuntos"])


@router.get(
    "/disciplinas/{disciplina_id}/assuntos",
    response_model=list[AssuntoResponse],
)
async def list_assuntos_by_disciplina(
    disciplina_id: UUID,
    concurso_id: UUID = Query(..., description="ID do concurso para filtro cascata"),
    db: AsyncSession = Depends(get_db),
):
    """
    Lista assuntos de uma disciplina filtrados por concurso.

    JOIN: assuntos ← questões ← provas
    Filtros: disciplina_id + concurso_id
    Performance: utiliza índice idx_questoes_assunto + idx_questoes_prova_disciplina
    """
    query = (
        select(
            Assunto.id,
            Assunto.nome,
            Assunto.slug,
            func.count(Questao.id).label("total_questoes"),
        )
        .join(Questao, Questao.assunto_id == Assunto.id)
        .join(Prova, Questao.prova_id == Prova.id)
        .where(
            Prova.concurso_id == concurso_id,
            Questao.disciplina_id == disciplina_id,
        )
        .group_by(Assunto.id, Assunto.nome, Assunto.slug)
        .order_by(Assunto.nome)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        AssuntoResponse(
            id=row.id,
            nome=row.nome,
            slug=row.slug,
            total_questoes=row.total_questoes,
        )
        for row in rows
    ]
