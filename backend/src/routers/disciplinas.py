"""
Router: Disciplinas (Filtro Cascata)

Endpoints:
  GET /api/concursos/{concurso_id}/disciplinas
    → Retorna APENAS as disciplinas que possuem questões naquele concurso.
    → Query SQL otimizada com JOIN e GROUP BY.
"""

from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models import Disciplina, Questao, Prova
from src.schemas import DisciplinaResponse

router = APIRouter(prefix="/api", tags=["Disciplinas"])


@router.get(
    "/concursos/{concurso_id}/disciplinas",
    response_model=list[DisciplinaResponse],
)
async def list_disciplinas_by_concurso(
    concurso_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Lista disciplinas que possuem questões em um concurso específico.

    Esta é a query central do filtro cascata:
    - Faz JOIN: disciplinas ← questões ← provas
    - Filtra pelo concurso_id
    - Agrupa por disciplina com contagem de questões
    - Ordena por nome da disciplina

    Performance: utiliza índice idx_questoes_prova_disciplina
    """
    query = (
        select(
            Disciplina.id,
            Disciplina.nome,
            Disciplina.slug,
            func.count(Questao.id).label("total_questoes"),
        )
        .join(Questao, Questao.disciplina_id == Disciplina.id)
        .join(Prova, Questao.prova_id == Prova.id)
        .where(Prova.concurso_id == concurso_id)
        .group_by(Disciplina.id, Disciplina.nome, Disciplina.slug)
        .order_by(Disciplina.nome)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        DisciplinaResponse(
            id=row.id,
            nome=row.nome,
            slug=row.slug,
            total_questoes=row.total_questoes,
        )
        for row in rows
    ]
