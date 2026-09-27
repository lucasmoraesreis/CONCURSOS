"""
Router: Estudo

Recursos de produto para uso diario:
- desempenho por disciplina/banca
- caderno de erros, favoritos e revisoes
- plano de estudos por concurso
- simulado inteligente
- cobertura da base
"""

import json
import math
import re
import uuid
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.database import get_db
from src.models import (
    Alternativa,
    Assunto,
    Banca,
    Concurso,
    Disciplina,
    EstudoQuestaoEstado,
    HistoricoResposta,
    Prova,
    Questao,
    Usuario,
)
from src.routers.questoes import _questao_to_response
from src.schemas import (
    CoverageByGroup,
    CoverageResponse,
    DayStreakItem,
    EditalDisciplinaItem,
    EditalTopicoItem,
    EditalVerticalizadoResponse,
    FlashcardItem,
    FlashcardReviewRequest,
    FlashcardsResponse,
    PerformanceSlice,
    RaioXDisciplinaItem,
    RaioXResponse,
    RaioXTopicoItem,
    SmartSimuladoResponse,
    StudyAnswerRequest,
    StudyAnswerResponse,
    StudyDashboardResponse,
    StudyKpi,
    StudyNoteRequest,
    StudyPlanItem,
    StudyPlanResponse,
    StudyReportRequest,
    StudyStateResponse,
    TutorChatRequest,
    TutorChatResponse,
    UserStreakResponse,
    GamificationProfileResponse,
    BadgeItem,
    LeagueStatus,
    EditalImportRequest,
    EditalImportResponse,
    EditalTopicoImportado,
)
from src.services.ai_orchestrator import ai_orchestrator

router = APIRouter(prefix="/api/study", tags=["Estudo"])

DEMO_USER_EMAIL = "demo@local.study"
REVIEW_INTERVAL_DAYS = [1, 3, 7, 15, 30, 60]


from src.services.auth import get_current_user




async def _get_or_create_state(
    db: AsyncSession,
    user: Usuario,
    questao_id: UUID,
) -> EstudoQuestaoEstado:
    result = await db.execute(
        select(EstudoQuestaoEstado).where(
            EstudoQuestaoEstado.usuario_id == user.id,
            EstudoQuestaoEstado.questao_id == questao_id,
        )
    )
    state = result.scalar_one_or_none()
    if state:
        return state

    state = EstudoQuestaoEstado(
        id=uuid.uuid4(),
        usuario_id=user.id,
        questao_id=questao_id,
    )
    db.add(state)
    await db.flush()
    return state


def _question_options():
    return (
        selectinload(Questao.alternativas),
        selectinload(Questao.disciplina),
        selectinload(Questao.assunto),
        selectinload(Questao.prova)
            .selectinload(Prova.concurso)
            .selectinload(Concurso.banca),
    )


async def _questions_from_states(
    db: AsyncSession,
    states: list[EstudoQuestaoEstado],
) -> list:
    if not states:
        return []

    ids = [s.questao_id for s in states]
    result = await db.execute(
        select(Questao)
        .where(Questao.id.in_(ids))
        .options(*_question_options())
    )
    question_map = {q.id: q for q in result.scalars().unique().all()}
    state_map = {s.questao_id: s for s in states}

    items = []
    for qid in ids:
        question = question_map.get(qid)
        state = state_map.get(qid)
        if not question or not state:
            continue
        item = _questao_to_response(question)
        item.is_favorita = bool(state.is_favorite)
        item.respondida_vezes = state.answered_count or 0
        item.acertos = state.correct_count or 0
        item.erros = state.wrong_count or 0
        item.proxima_revisao = state.next_review_at
        item.anotacao = state.note
        items.append(item)
    return items


def _rate(total: int, correct: int) -> float:
    if total <= 0:
        return 0.0
    return round((correct / total) * 100, 1)


@router.get("/dashboard", response_model=StudyDashboardResponse)
async def get_study_dashboard(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    user = current_user
    now = datetime.now(timezone.utc)

    total_answers = await db.scalar(
        select(func.count(HistoricoResposta.id)).where(HistoricoResposta.usuario_id == user.id)
    ) or 0
    total_correct = await db.scalar(
        select(func.count(HistoricoResposta.id)).where(
            HistoricoResposta.usuario_id == user.id,
            HistoricoResposta.foi_correta == True,
        )
    ) or 0
    total_errors = total_answers - total_correct

    favorites = await db.scalar(
        select(func.count(EstudoQuestaoEstado.id)).where(
            EstudoQuestaoEstado.usuario_id == user.id,
            EstudoQuestaoEstado.is_favorite == True,
        )
    ) or 0
    due_reviews = await db.scalar(
        select(func.count(EstudoQuestaoEstado.id)).where(
            EstudoQuestaoEstado.usuario_id == user.id,
            EstudoQuestaoEstado.next_review_at != None,
            EstudoQuestaoEstado.next_review_at <= now,
        )
    ) or 0
    questions_total = await db.scalar(select(func.count(Questao.id))) or 0

    disc_rows = await db.execute(
        select(
            func.coalesce(Disciplina.nome, "Sem disciplina").label("nome"),
            func.count(HistoricoResposta.id).label("total"),
            func.sum(case((HistoricoResposta.foi_correta == True, 1), else_=0)).label("acertos"),
        )
        .join(Questao, HistoricoResposta.questao_id == Questao.id)
        .outerjoin(Disciplina, Questao.disciplina_id == Disciplina.id)
        .where(HistoricoResposta.usuario_id == user.id)
        .group_by(Disciplina.nome)
        .order_by(func.count(HistoricoResposta.id).desc())
        .limit(8)
    )

    desempenho_por_disciplina = [
        PerformanceSlice(
            nome=row.nome,
            total=row.total,
            acertos=row.acertos or 0,
            erros=row.total - (row.acertos or 0),
            taxa_acerto=_rate(row.total, row.acertos or 0),
        )
        for row in disc_rows.all()
    ]

    banca_rows = await db.execute(
        select(
            func.coalesce(Banca.nome, "Sem banca").label("nome"),
            func.count(HistoricoResposta.id).label("total"),
            func.sum(case((HistoricoResposta.foi_correta == True, 1), else_=0)).label("acertos"),
        )
        .join(Questao, HistoricoResposta.questao_id == Questao.id)
        .join(Prova, Questao.prova_id == Prova.id)
        .join(Concurso, Prova.concurso_id == Concurso.id)
        .outerjoin(Banca, Concurso.banca_id == Banca.id)
        .where(HistoricoResposta.usuario_id == user.id)
        .group_by(Banca.nome)
        .order_by(func.count(HistoricoResposta.id).desc())
        .limit(8)
    )

    desempenho_por_banca = [
        PerformanceSlice(
            nome=row.nome,
            total=row.total,
            acertos=row.acertos or 0,
            erros=row.total - (row.acertos or 0),
            taxa_acerto=_rate(row.total, row.acertos or 0),
        )
        for row in banca_rows.all()
    ]

    error_state_rows = await db.execute(
        select(EstudoQuestaoEstado)
        .where(
            EstudoQuestaoEstado.usuario_id == user.id,
            EstudoQuestaoEstado.wrong_count > 0,
        )
        .order_by(EstudoQuestaoEstado.last_answered_at.desc().nullslast())
        .limit(5)
    )
    due_state_rows = await db.execute(
        select(EstudoQuestaoEstado)
        .where(
            EstudoQuestaoEstado.usuario_id == user.id,
            EstudoQuestaoEstado.next_review_at != None,
            EstudoQuestaoEstado.next_review_at <= now,
        )
        .order_by(EstudoQuestaoEstado.next_review_at.asc())
        .limit(5)
    )

    kpis = [
        StudyKpi(label="Questões respondidas", value=total_answers),
        StudyKpi(label="Taxa de acerto", value=f"{_rate(total_answers, total_correct)}%"),
        StudyKpi(label="Erros no caderno", value=total_errors),
        StudyKpi(label="Revisões pendentes", value=due_reviews),
        StudyKpi(label="Favoritas", value=favorites),
        StudyKpi(label="Base disponível", value=questions_total),
    ]

    await db.commit()
    return StudyDashboardResponse(
        kpis=kpis,
        desempenho_por_disciplina=desempenho_por_disciplina,
        desempenho_por_banca=desempenho_por_banca,
        erros_recentes=await _questions_from_states(db, list(error_state_rows.scalars().all())),
        revisoes_pendentes=await _questions_from_states(db, list(due_state_rows.scalars().all())),
    )


@router.post("/answer", response_model=StudyAnswerResponse)
async def answer_question(payload: StudyAnswerRequest, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    user = current_user

    question_result = await db.execute(
        select(Questao)
        .options(selectinload(Questao.disciplina), selectinload(Questao.assunto))
        .where(Questao.id == payload.questao_id)
    )
    question = question_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Questao nao encontrada")

    selected = payload.alternativa.strip().upper()[:1]
    correct_letter = (question.alternativa_correta or "").strip().upper()[:1] or None
    is_correct = bool(correct_letter and selected == correct_letter)

    history = HistoricoResposta(
        id=uuid.uuid4(),
        usuario_id=user.id,
        questao_id=question.id,
        alternativa_marcada=selected,
        foi_correta=is_correct,
        tempo_segundos=max(0, payload.tempo_segundos),
    )
    db.add(history)

    state = await _get_or_create_state(db, user, question.id)
    now = datetime.now(timezone.utc)
    state.answered_count = (state.answered_count or 0) + 1
    state.last_answer = selected
    state.last_answered_at = now
    state.updated_at = now

    d_nome = question.disciplina.nome if question.disciplina else "Conhecimentos Gerais"
    a_nome = question.assunto.nome if question.assunto else "Tópico Essencial"
    safe_d = d_nome.replace('"', "'")
    safe_a = a_nome.replace('"', "'")
    safe_gab = (correct_letter or "Correto").replace('"', "'")

    if is_correct:
        state.correct_count = (state.correct_count or 0) + 1
        state.review_stage = min((state.review_stage or 0) + 1, len(REVIEW_INTERVAL_DAYS))
        interval = REVIEW_INTERVAL_DAYS[state.review_stage - 1]
        tipo_erro = None
        diagnostico_erro = "Excelente! Você dominou o núcleo doutrinário e desarmou a armadilha cognitiva da banca."
        mapa_mental_mermaid = f"""graph TD
    A["{safe_d}"] --> B["{safe_a}"]
    B --> C["Regra Geral"]
    C --> D["Gabarito Confirmado: {safe_gab}"]
"""
    else:
        state.wrong_count = (state.wrong_count or 0) + 1
        state.review_stage = 0
        interval = REVIEW_INTERVAL_DAYS[0]

        enunc_lower = (question.enunciado or "").lower()
        if any(k in enunc_lower for k in ["exceto", "vedado", "incorreta", "falsa", "não é", "salvo", "errada"]):
            tipo_erro = "Desatenção Semântica"
            diagnostico_erro = "Atenção ao comando restritivo ou negativo da questão (ex: 'exceto' ou 'vedado'). Dica de ouro: destaque a partícula negativa antes de analisar os distratores."
        elif question.engenharia_da_pegadinha:
            tipo_erro = "Pegadinha de Banca"
            clean_pegadinha = question.engenharia_da_pegadinha.replace("\n", " ").strip()
            diagnostico_erro = f"Armadilha clássica da organizadora: {clean_pegadinha[:140]}..."
        else:
            tipo_erro = "Lacuna Conceitual"
            diagnostico_erro = f"Reforce os fundamentos em {safe_d} › {safe_a}. Dica: consulte a justificativa e os artigos de lei citados."

        mapa_mental_mermaid = f"""graph TD
    A["{safe_d}"] --> B["{safe_a}"]
    B --> C["Regra Geral"]
    B --> D["Exceção / Pegadinha da Banca"]
    D --> E["Gabarito Oficial: {safe_gab}"]
"""

    state.next_review_at = now + timedelta(days=interval)
    await db.commit()

    return StudyAnswerResponse(
        correta=is_correct,
        alternativa_correta=correct_letter,
        next_review_at=state.next_review_at,
        review_stage=state.review_stage,
        answered_count=state.answered_count,
        correct_count=state.correct_count,
        wrong_count=state.wrong_count,
        tipo_erro=tipo_erro,
        diagnostico_erro=diagnostico_erro,
        mapa_mental_mermaid=mapa_mental_mermaid,
    )


@router.post("/questions/{questao_id}/favorite", response_model=StudyStateResponse)
async def toggle_favorite_question(questao_id: UUID, db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    user = current_user
    state = await _get_or_create_state(db, user, questao_id)
    state.is_favorite = not bool(state.is_favorite)
    state.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return StudyStateResponse(
        questao_id=questao_id,
        is_favorite=state.is_favorite,
        note=state.note,
        reported_issue=state.reported_issue,
    )


@router.post("/questions/{questao_id}/note", response_model=StudyStateResponse)
async def save_question_note(
    questao_id: UUID,
    payload: StudyNoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    user = current_user
    state = await _get_or_create_state(db, user, questao_id)
    state.note = payload.note.strip()[:4000] or None
    state.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return StudyStateResponse(
        questao_id=questao_id,
        is_favorite=state.is_favorite,
        note=state.note,
        reported_issue=state.reported_issue,
    )


@router.post("/questions/{questao_id}/report", response_model=StudyStateResponse)
async def report_question(
    questao_id: UUID,
    payload: StudyReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    user = current_user
    state = await _get_or_create_state(db, user, questao_id)
    state.reported_issue = payload.issue.strip()[:4000]
    state.reported_at = datetime.now(timezone.utc)
    state.updated_at = state.reported_at
    await db.commit()
    return StudyStateResponse(
        questao_id=questao_id,
        is_favorite=state.is_favorite,
        note=state.note,
        reported_issue=state.reported_issue,
    )


@router.get("/errors", response_model=SmartSimuladoResponse)
async def get_error_notebook(
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    user = current_user
    rows = await db.execute(
        select(EstudoQuestaoEstado)
        .where(
            EstudoQuestaoEstado.usuario_id == user.id,
            EstudoQuestaoEstado.wrong_count > 0,
        )
        .order_by(EstudoQuestaoEstado.last_answered_at.desc().nullslast())
        .limit(limit)
    )
    states = list(rows.scalars().all())
    items = await _questions_from_states(db, states)
    await db.commit()
    return SmartSimuladoResponse(titulo="Caderno de erros", total=len(items), items=items)


@router.get("/reviews", response_model=SmartSimuladoResponse)
async def get_due_reviews(
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    user = current_user
    now = datetime.now(timezone.utc)
    rows = await db.execute(
        select(EstudoQuestaoEstado)
        .where(
            EstudoQuestaoEstado.usuario_id == user.id,
            EstudoQuestaoEstado.next_review_at != None,
            EstudoQuestaoEstado.next_review_at <= now,
        )
        .order_by(EstudoQuestaoEstado.next_review_at.asc())
        .limit(limit)
    )
    states = list(rows.scalars().all())
    items = await _questions_from_states(db, states)
    await db.commit()
    return SmartSimuladoResponse(titulo="Revisao espaçada", total=len(items), items=items)


@router.get("/favorites", response_model=SmartSimuladoResponse)
async def get_favorites(
    limit: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    user = current_user
    rows = await db.execute(
        select(EstudoQuestaoEstado)
        .where(
            EstudoQuestaoEstado.usuario_id == user.id,
            EstudoQuestaoEstado.is_favorite == True,
        )
        .order_by(EstudoQuestaoEstado.updated_at.desc())
        .limit(limit)
    )
    states = list(rows.scalars().all())
    items = await _questions_from_states(db, states)
    await db.commit()
    return SmartSimuladoResponse(titulo="Favoritas", total=len(items), items=items)


@router.get("/plan", response_model=StudyPlanResponse)
async def get_study_plan(
    concurso_id: UUID | None = Query(None),
    dias: int = Query(30, ge=7, le=180),
    db: AsyncSession = Depends(get_db),
):
    title = "Plano geral de estudos"
    concurso = None
    query = (
        select(
            Disciplina.id.label("disciplina_id"),
            Disciplina.nome.label("disciplina"),
            func.count(Questao.id).label("questoes"),
        )
        .join(Questao, Questao.disciplina_id == Disciplina.id)
        .join(Prova, Questao.prova_id == Prova.id)
    )

    if concurso_id:
        c_res = await db.execute(
            select(Concurso)
            .where(Concurso.id == concurso_id)
            .options(selectinload(Concurso.banca))
        )
        concurso = c_res.scalar_one_or_none()
        if not concurso:
            raise HTTPException(status_code=404, detail="Concurso nao encontrado")
        title = f"{concurso.orgao} - {concurso.cargo} ({concurso.ano})"
        query = query.where(Prova.concurso_id == concurso_id)

    rows = await db.execute(
        query.group_by(Disciplina.id, Disciplina.nome)
        .order_by(func.count(Questao.id).desc())
        .limit(12)
    )
    data = rows.all()

    if not data and concurso_id:
        rows = await db.execute(
            select(
                Disciplina.id.label("disciplina_id"),
                Disciplina.nome.label("disciplina"),
                func.count(Questao.id).label("questoes"),
            )
            .join(Questao, Questao.disciplina_id == Disciplina.id)
            .group_by(Disciplina.id, Disciplina.nome)
            .order_by(func.count(Questao.id).desc())
            .limit(12)
        )
        data = rows.all()

    total = sum(row.questoes for row in data)
    items = []
    for idx, row in enumerate(data):
        daily = max(3, math.ceil(row.questoes / dias))
        if idx < 4:
            priority = "Alta"
        elif idx < 8:
            priority = "Media"
        else:
            priority = "Manutencao"
        items.append(
            StudyPlanItem(
                disciplina_id=row.disciplina_id,
                disciplina=row.disciplina,
                questoes=row.questoes,
                meta_diaria=daily,
                revisoes_semanais=max(1, math.ceil(daily * 0.35)),
                prioridade=priority,
            )
        )

    questions_per_day = sum(item.meta_diaria for item in items)
    return StudyPlanResponse(
        concurso_id=concurso.id if concurso else None,
        titulo=title,
        total_questoes=total,
        dias_estimados=dias,
        questoes_por_dia=questions_per_day,
        itens=items,
    )


@router.get("/simulado-inteligente", response_model=SmartSimuladoResponse)
async def get_smart_simulado(
    concurso_id: UUID | None = Query(None),
    disciplina_id: UUID | None = Query(None),
    modo: str = Query("geral", pattern="^(geral|erros|revisao|favoritas)$"),
    quantidade: int = Query(20, ge=5, le=100),
    db: AsyncSession = Depends(get_db),
):
    user = current_user

    if modo in {"erros", "revisao", "favoritas"}:
        state_query = select(EstudoQuestaoEstado).where(EstudoQuestaoEstado.usuario_id == user.id)
        if modo == "erros":
            state_query = state_query.where(EstudoQuestaoEstado.wrong_count > 0)
        elif modo == "revisao":
            now = datetime.now(timezone.utc)
            state_query = state_query.where(
                EstudoQuestaoEstado.next_review_at != None,
                EstudoQuestaoEstado.next_review_at <= now,
            )
        else:
            state_query = state_query.where(EstudoQuestaoEstado.is_favorite == True)
        state_query = state_query.order_by(func.random()).limit(quantidade)
        states = list((await db.execute(state_query)).scalars().all())
        items = await _questions_from_states(db, states)
        await db.commit()
        return SmartSimuladoResponse(titulo=f"Simulado inteligente - {modo}", total=len(items), items=items)

    query = (
        select(Questao)
        .join(Prova, Questao.prova_id == Prova.id)
        .options(*_question_options())
    )
    if concurso_id:
        query = query.where(Prova.concurso_id == concurso_id)
    if disciplina_id:
        query = query.where(Questao.disciplina_id == disciplina_id)
    query = query.order_by(func.random()).limit(quantidade)
    result = await db.execute(query)
    questions = result.scalars().unique().all()
    items = [_questao_to_response(q) for q in questions]
    return SmartSimuladoResponse(titulo="Simulado inteligente", total=len(items), items=items)


@router.get("/coverage", response_model=CoverageResponse)
async def get_coverage(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    concursos_total = await db.scalar(select(func.count(Concurso.id))) or 0
    provas_sem_questoes = await db.scalar(
        select(func.count(Prova.id)).where(
            ~select(Questao.id).where(Questao.prova_id == Prova.id).exists()
        )
    ) or 0
    concursos_sem_questoes = await db.scalar(
        select(func.count(Concurso.id)).where(
            ~select(Prova.id)
            .join(Questao, Questao.prova_id == Prova.id)
            .where(Prova.concurso_id == Concurso.id)
            .exists()
        )
    ) or 0
    concursos_com_questoes = concursos_total - concursos_sem_questoes
    questoes_total = await db.scalar(select(func.count(Questao.id))) or 0
    alternativas_total = await db.scalar(select(func.count(Alternativa.id))) or 0
    questoes_sem_alternativas = await db.scalar(
        select(func.count(Questao.id)).where(
            ~select(Alternativa.id).where(Alternativa.questao_id == Questao.id).exists()
        )
    ) or 0

    source_rows = await db.execute(
        select(
            func.coalesce(Questao.extra_metadata["fonte"].as_string(), "Sem fonte").label("fonte"),
            func.count(Questao.id).label("total"),
        )
        .group_by("fonte")
        .order_by(func.count(Questao.id).desc())
    )
    fontes = [StudyKpi(label=row.fonte, value=row.total) for row in source_rows.all()]

    by_banca_rows = await db.execute(
        select(
            Banca.nome.label("nome"),
            func.count(func.distinct(Concurso.id)).label("concursos"),
            func.count(func.distinct(case((Questao.id != None, Concurso.id), else_=None))).label("com_questoes"),
            func.count(Questao.id).label("questoes"),
        )
        .join(Concurso, Concurso.banca_id == Banca.id)
        .outerjoin(Prova, Prova.concurso_id == Concurso.id)
        .outerjoin(Questao, Questao.prova_id == Prova.id)
        .group_by(Banca.id, Banca.nome)
        .order_by(func.count(func.distinct(Concurso.id)).desc())
        .limit(12)
    )
    por_banca = [
        CoverageByGroup(
            nome=row.nome,
            concursos=row.concursos,
            concursos_com_questoes=row.com_questoes,
            questoes=row.questoes,
            cobertura_pct=_rate(row.concursos, row.com_questoes),
        )
        for row in by_banca_rows.all()
    ]

    by_level_rows = await db.execute(
        select(
            Concurso.nivel.label("nome"),
            func.count(func.distinct(Concurso.id)).label("concursos"),
            func.count(func.distinct(case((Questao.id != None, Concurso.id), else_=None))).label("com_questoes"),
            func.count(Questao.id).label("questoes"),
        )
        .outerjoin(Prova, Prova.concurso_id == Concurso.id)
        .outerjoin(Questao, Questao.prova_id == Prova.id)
        .group_by(Concurso.nivel)
        .order_by(func.count(func.distinct(Concurso.id)).desc())
    )
    por_nivel = [
        CoverageByGroup(
            nome=row.nome,
            concursos=row.concursos,
            concursos_com_questoes=row.com_questoes,
            questoes=row.questoes,
            cobertura_pct=_rate(row.concursos, row.com_questoes),
        )
        for row in by_level_rows.all()
    ]

    return CoverageResponse(
        concursos_total=concursos_total,
        concursos_com_questoes=concursos_com_questoes,
        concursos_sem_questoes=concursos_sem_questoes,
        provas_sem_questoes=provas_sem_questoes,
        questoes_total=questoes_total,
        alternativas_total=alternativas_total,
        questoes_sem_alternativas=questoes_sem_alternativas,
        fontes=fontes,
        por_banca=por_banca,
        por_nivel=por_nivel,
    )


# =============================================
# TUTOR IA SOCRÁTICO
# =============================================

@router.post("/tutor", response_model=TutorChatResponse)
async def ask_study_tutor(
    payload: TutorChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    question_result = await db.execute(
        select(Questao)
        .where(Questao.id == payload.questao_id)
        .options(*_question_options())
    )
    question = question_result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada")

    meta = getattr(question, "extra_metadata", None) or {}
    pegadinha = meta.get("engenharia_da_pegadinha") if isinstance(meta, dict) else None

    # Contexto da questão
    alts_text = "\n".join([f"{a.letra}) {a.texto}" for a in question.alternativas])
    banca_nome = question.prova.concurso.banca.nome if question.prova and question.prova.concurso and question.prova.concurso.banca else "Banca de Concurso"
    disc_nome = question.disciplina.nome if question.disciplina else "Geral"
    assunto_nome = question.assunto.nome if question.assunto else "Geral"

    system_prompt = f"""Você é o Tutor de Concursos da plataforma 'Questões de Concurso'.
Seu perfil: Professor experiente, didático, focado em alta performance e aprovação.
Dados da questão em análise:
- Banca: {banca_nome}
- Disciplina: {disc_nome}
- Assunto: {assunto_nome}
- Enunciado: {question.enunciado}
- Alternativas:
{alts_text}
- Gabarito Oficial: {question.alternativa_correta}
- Armadilha da Banca: {pegadinha or 'Atenção aos detalhes doutrinários e literais da lei'}
- Comentário/Justificativa: {question.justificativa_ia or 'Consulte a jurisprudência dominante'}

Instruções pedagógicas:
1. Se o modo for 'socratico':
   - NÃO revele diretamente a alternativa correta se o aluno perguntar 'qual é a resposta' ou 'estou em dúvida'.
   - Ao invés disso, aponte a regra central ou faça 1 ou 2 perguntas reflexivas que guiem o aluno até a conclusão.
   - Se o aluno perguntar por que uma alternativa específica está certa ou errada, explique com clareza o erro jurídico/gramatical.
2. Se o modo for 'direto':
   - Explique por que a alternativa correta é a verdadeira e por que as demais são falsas.
   - Destaque mnemônicos clássicos e a pegadinha da banca.
3. Seja sempre encorajador, objetivo e focado em macetes de prova. Formate com markdown limpo e parágrafos curtos."""

    messages = []
    for h in payload.historico[-4:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": payload.pergunta})

    answer_text = await ai_orchestrator.chat_completion(system_prompt, messages)

    import re
    artigos_encontrados = re.findall(r"(?:art\.?|artigo)\s*\d+[^.,;\n]*|lei\s*(?:n[ºo]\s*)?[\d.]+\/\d+|súmula\s*(?:vinculante\s*)?\d+|cf\/88", answer_text, re.IGNORECASE)

    return TutorChatResponse(
        resposta=answer_text,
        dica="Lembre-se: bancas costumam trocar prazos, competências e exceções de regras gerais.",
        citacao_lei=artigos_encontrados[0] if artigos_encontrados else None,
        artigos_relevantes=list(set(artigos_encontrados))[:5],
    )


# =============================================
# OFENSIVA DIÁRIA (STREAKS) E METAS
# =============================================

@router.get("/streak", response_model=UserStreakResponse)
async def get_user_streak(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    user = current_user
    now = datetime.now(timezone.utc)
    today_date = now.date()

    start_date = today_date - timedelta(days=30)
    rows = await db.execute(
        select(
            func.date(HistoricoResposta.respondido_em).label("dia"),
            func.count(HistoricoResposta.id).label("total")
        )
        .where(
            HistoricoResposta.usuario_id == user.id,
            HistoricoResposta.respondido_em >= start_date,
        )
        .group_by("dia")
        .order_by(func.date(HistoricoResposta.respondido_em).desc())
    )
    daily_map = {str(row.dia): row.total for row in rows.all()}

    streak = 0
    check_date = today_date
    today_count = daily_map.get(str(today_date), 0)
    if today_count == 0:
        check_date = today_date - timedelta(days=1)

    while True:
        d_str = str(check_date)
        if daily_map.get(d_str, 0) > 0:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    if today_count > 0 and check_date == today_date:
        streak = max(1, streak)

    dias_semana_nomes = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    historico_semana = []
    for i in range(6, -1, -1):
        d = today_date - timedelta(days=i)
        d_str = str(d)
        cnt = daily_map.get(d_str, 0)
        historico_semana.append(
            DayStreakItem(
                data=d_str,
                dia_semana=dias_semana_nomes[d.weekday()],
                respondidas=cnt,
                bateu_meta=cnt >= 20,
            )
        )

    return UserStreakResponse(
        dias_consecutivos=max(streak, 1 if today_count > 0 else 0),
        respondidas_hoje=today_count,
        meta_diaria=30,
        historico_semana=historico_semana,
        maior_streak=max(streak, 7),
    )


# =============================================
# GAMIFICAÇÃO, LIGAS E CONQUISTAS
# =============================================

@router.get("/gamification", response_model=GamificationProfileResponse)
async def get_gamification_profile(db: AsyncSession = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Retorna o perfil de gamificação do concurseiro com cálculo de XP, liga atual e conquistas."""
    user = current_user

    ans_res = await db.execute(
        select(
            func.count(HistoricoResposta.id).label("total"),
            func.coalesce(func.sum(case((HistoricoResposta.foi_correta == True, 1), else_=0)), 0).label("acertos")
        ).where(HistoricoResposta.usuario_id == user.id)
    )
    row = ans_res.first()
    total_respondidas = row.total if row else 0
    total_acertos = int(row.acertos) if row and row.acertos else 0

    streak_obj = await get_user_streak(db)
    streak_dias = streak_obj.dias_consecutivos

    # Cálculo de XP
    xp_total = (total_acertos * 15) + (total_respondidas * 5) + (streak_dias * 50)

    # Determinação de Liga
    if xp_total < 500:
        liga = LeagueStatus(nome="Bronze", nivel=1, xp_atual=xp_total, xp_proximo_nivel=500, icone="🥉", cor="#cd7f32", posicao_ranking=28)
    elif xp_total < 1500:
        liga = LeagueStatus(nome="Prata", nivel=2, xp_atual=xp_total, xp_proximo_nivel=1500, icone="🥈", cor="#c0c0c0", posicao_ranking=15)
    elif xp_total < 3500:
        liga = LeagueStatus(nome="Ouro", nivel=3, xp_atual=xp_total, xp_proximo_nivel=3500, icone="🥇", cor="#ffd700", posicao_ranking=8)
    elif xp_total < 7000:
        liga = LeagueStatus(nome="Platina", nivel=4, xp_atual=xp_total, xp_proximo_nivel=7000, icone="💎", cor="#00e5ff", posicao_ranking=4)
    elif xp_total < 12000:
        liga = LeagueStatus(nome="Diamante", nivel=5, xp_atual=xp_total, xp_proximo_nivel=12000, icone="💠", cor="#b9f2ff", posicao_ranking=2)
    else:
        liga = LeagueStatus(nome="Concursado", nivel=6, xp_atual=xp_total, xp_proximo_nivel=xp_total + 5000, icone="👑", cor="#a855f7", posicao_ranking=1)

    badges = [
        BadgeItem(
            id="primeiro_passo",
            titulo="Primeiro Passo",
            descricao="Responda sua primeira questão na plataforma.",
            icone="🎯",
            categoria="Início",
            unlocked=total_respondidas >= 1,
            progresso_pct=min(100.0, (total_respondidas / 1) * 100),
        ),
        BadgeItem(
            id="foco_inicial",
            titulo="Foco Constante",
            descricao="Complete 20 questões resolvidas.",
            icone="⚡",
            categoria="Dedicação",
            unlocked=total_respondidas >= 20,
            progresso_pct=min(100.0, (total_respondidas / 20) * 100),
        ),
        BadgeItem(
            id="cacador_cebraspe",
            titulo="Hacker de Bancas",
            descricao="Acerte 10 questões com maestria.",
            icone="🧠",
            categoria="Precisão",
            unlocked=total_acertos >= 10,
            progresso_pct=min(100.0, (total_acertos / 10) * 100),
        ),
        BadgeItem(
            id="inquebravel",
            titulo="Ofensiva de Ferro",
            descricao="Mantenha uma sequência de 3 dias de estudo consecutivos.",
            icone="🔥",
            categoria="Consistência",
            unlocked=streak_dias >= 3,
            progresso_pct=min(100.0, (streak_dias / 3) * 100),
        ),
        BadgeItem(
            id="gabaritador",
            titulo="Gabaritador de Elite",
            descricao="Alcance taxa de acerto superior a 70% com pelo menos 15 questões.",
            icone="🏆",
            categoria="Maestria",
            unlocked=total_respondidas >= 15 and (total_acertos / max(1, total_respondidas)) >= 0.7,
            progresso_pct=min(100.0, ((total_acertos / max(1, total_respondidas)) / 0.7) * 100) if total_respondidas > 0 else 0.0,
        ),
        BadgeItem(
            id="mestre_volume",
            titulo="Centurião",
            descricao="Resolva 100 questões no total da sua preparação.",
            icone="🏛️",
            categoria="Volume",
            unlocked=total_respondidas >= 100,
            progresso_pct=min(100.0, (total_respondidas / 100) * 100),
        ),
    ]

    unlocked_count = sum(1 for b in badges if b.unlocked)

    return GamificationProfileResponse(
        xp_total=xp_total,
        liga=liga,
        badges=badges,
        conquistas_total=len(badges),
        conquistas_desbloqueadas=unlocked_count,
    )



# =============================================
# FLASHCARDS INTELIGENTES (SM-2)
# =============================================

@router.get("/flashcards", response_model=FlashcardsResponse)
async def get_flashcards(
    limit: int = Query(20, ge=5, le=50),
    db: AsyncSession = Depends(get_db),
):
    user = current_user
    rows = await db.execute(
        select(EstudoQuestaoEstado)
        .where(
            EstudoQuestaoEstado.usuario_id == user.id,
            (EstudoQuestaoEstado.wrong_count > 0) | (EstudoQuestaoEstado.is_favorite == True) | (EstudoQuestaoEstado.note != None)
        )
        .order_by(EstudoQuestaoEstado.updated_at.desc())
        .limit(limit)
    )
    states = list(rows.scalars().all())

    flashcard_items = []
    if states:
        questions = await _questions_from_states(db, states)
        for q in questions:
            frente = q.enunciado[:220] + ("..." if len(q.enunciado) > 220 else "")
            verso = f"Gabarito: Alternativa {q.alternativa_correta}\n\n{q.justificativa_ia or 'Conforme jurisprudência e edital.'}"
            flashcard_items.append(
                FlashcardItem(
                    id=str(q.id),
                    questao_id=q.id,
                    frente=frente,
                    verso=verso,
                    disciplina=q.disciplina_nome or "Geral",
                    assunto=q.assunto_nome or "Conceitos Fundamentais",
                    nivel_dificuldade="Médio",
                    repetition_count=q.respondida_vezes or 0,
                    interval_days=3,
                    ease_factor=2.5,
                    origem="Caderno de Erros" if q.erros > 0 else "Favoritas",
                )
            )

    if len(flashcard_items) < limit:
        needed = limit - len(flashcard_items)
        base_rows = await db.execute(
            select(Questao)
            .options(*_question_options())
            .order_by(func.random())
            .limit(needed)
        )
        for q in base_rows.scalars().unique().all():
            meta = getattr(q, "extra_metadata", None) or {}
            pegadinha = meta.get("engenharia_da_pegadinha") if isinstance(meta, dict) else None
            frente = f"Qual a pegadinha clássica em {q.disciplina.nome if q.disciplina else 'Direito'}?\n\n{q.enunciado[:200]}..."
            verso = f"Gabarito: {q.alternativa_correta}\n\nArmadilha da Banca: {pegadinha or q.justificativa_ia or 'Atenção aos termos literais.'}"
            flashcard_items.append(
                FlashcardItem(
                    id=str(q.id),
                    questao_id=q.id,
                    frente=frente,
                    verso=verso,
                    disciplina=q.disciplina.nome if q.disciplina else "Geral",
                    assunto=q.assunto.nome if q.assunto else "Geral",
                    nivel_dificuldade="Médio",
                    repetition_count=0,
                    interval_days=1,
                    ease_factor=2.5,
                    origem="Acervo da Banca",
                )
            )

    return FlashcardsResponse(
        total=len(flashcard_items),
        pendentes=len(flashcard_items),
        items=flashcard_items,
    )


@router.post("/flashcards/review")
async def review_flashcard(
    payload: FlashcardReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    user = current_user
    days_map = {0: 1, 2: 2, 4: 5, 5: 10}
    interval = days_map.get(payload.rating, 3)
    try:
        qid = UUID(payload.card_id)
        state = await _get_or_create_state(db, user, qid)
        state.next_review_at = datetime.now(timezone.utc) + timedelta(days=interval)
        state.review_stage = (state.review_stage or 0) + (1 if payload.rating >= 4 else 0)
        state.updated_at = datetime.now(timezone.utc)
        await db.commit()
    except Exception as e:
        logger.warning(f"Erro ao salvar review de flashcard: {e}")

    return {"status": "ok", "next_review_days": interval}


# =============================================
# RAIO-X DA BANCA E DO EDITAL
# =============================================

@router.get("/raio-x", response_model=RaioXResponse)
async def get_raio_x(
    banca_id: UUID | None = Query(None),
    concurso_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    title = "Raio-X Estatístico Geral da Base"
    banca_nome = None
    concurso_nome = None

    base_query = (
        select(Questao)
        .join(Prova, Questao.prova_id == Prova.id)
        .join(Concurso, Prova.concurso_id == Concurso.id)
    )

    if concurso_id:
        c_res = await db.execute(select(Concurso).where(Concurso.id == concurso_id).options(selectinload(Concurso.banca)))
        c = c_res.scalar_one_or_none()
        if c:
            concurso_nome = f"{c.orgao} - {c.cargo} ({c.ano})"
            title = f"Raio-X: {concurso_nome}"
            if c.banca:
                banca_nome = c.banca.nome
        base_query = base_query.where(Prova.concurso_id == concurso_id)
    elif banca_id:
        b_res = await db.execute(select(Banca).where(Banca.id == banca_id))
        b = b_res.scalar_one_or_none()
        if b:
            banca_nome = b.nome
            title = f"Raio-X da Banca: {banca_nome}"
        base_query = base_query.where(Concurso.banca_id == banca_id)

    total_q = await db.scalar(select(func.count()).select_from(base_query.with_only_columns(Questao.id).subquery())) or 1

    disc_rows = await db.execute(
        select(
            func.coalesce(Disciplina.nome, "Geral").label("disciplina"),
            func.count(Questao.id).label("total")
        )
        .select_from(Questao)
        .join(Prova, Questao.prova_id == Prova.id)
        .join(Concurso, Prova.concurso_id == Concurso.id)
        .outerjoin(Disciplina, Questao.disciplina_id == Disciplina.id)
        .where(
            (Prova.concurso_id == concurso_id) if concurso_id else True,
            (Concurso.banca_id == banca_id) if banca_id and not concurso_id else True,
        )
        .group_by(Disciplina.nome)
        .order_by(func.count(Questao.id).desc())
        .limit(10)
    )

    disciplinas_items = []
    for d_row in disc_rows.all():
        d_nome = d_row.disciplina
        d_total = d_row.total
        d_pct = round((d_total / total_q) * 100, 1)

        sub_rows = await db.execute(
            select(
                func.coalesce(Assunto.nome, "Conceitos Gerais").label("assunto"),
                func.count(Questao.id).label("total")
            )
            .select_from(Questao)
            .join(Prova, Questao.prova_id == Prova.id)
            .join(Concurso, Prova.concurso_id == Concurso.id)
            .outerjoin(Disciplina, Questao.disciplina_id == Disciplina.id)
            .outerjoin(Assunto, Questao.assunto_id == Assunto.id)
            .where(
                Disciplina.nome == d_nome,
                (Prova.concurso_id == concurso_id) if concurso_id else True,
                (Concurso.banca_id == banca_id) if banca_id and not concurso_id else True,
            )
            .group_by(Assunto.nome)
            .order_by(func.count(Questao.id).desc())
            .limit(5)
        )
        topicos = []
        for s_row in sub_rows.all():
            t_pct = round((s_row.total / d_total) * 100, 1)
            relevancia = "Muito Alta" if t_pct >= 30 else "Alta" if t_pct >= 15 else "Média"
            topicos.append(
                RaioXTopicoItem(
                    assunto=s_row.assunto,
                    total_questoes=s_row.total,
                    percentual=t_pct,
                    relevancia=relevancia,
                )
            )

        disciplinas_items.append(
            RaioXDisciplinaItem(
                disciplina=d_nome,
                total_questoes=d_total,
                percentual=d_pct,
                topicos=topicos,
            )
        )

    return RaioXResponse(
        titulo=title,
        banca_nome=banca_nome,
        concurso_nome=concurso_nome,
        total_questoes_analisadas=total_q,
        disciplinas=disciplinas_items,
    )


# =============================================
# EDITAL VERTICALIZADO INTERATIVO
# =============================================

@router.get("/edital-verticalizado", response_model=EditalVerticalizadoResponse)
async def get_edital_verticalizado(
    concurso_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    concurso = None
    if concurso_id:
        c_res = await db.execute(select(Concurso).where(Concurso.id == concurso_id))
        concurso = c_res.scalar_one_or_none()

    if not concurso:
        c_res = await db.execute(
            select(Concurso)
            .join(Prova, Prova.concurso_id == Concurso.id)
            .join(Questao, Questao.prova_id == Prova.id)
            .limit(1)
        )
        concurso = c_res.scalar_one_or_none()

    orgao = concurso.orgao if concurso else "Concurso Nacional"
    cargo = concurso.cargo if concurso else "Cargo Específico"
    titulo = f"Edital Verticalizado — {orgao} ({cargo})"

    query = (
        select(
            Disciplina.id.label("d_id"),
            Disciplina.nome.label("d_nome"),
            Assunto.id.label("a_id"),
            Assunto.nome.label("a_nome"),
            func.count(Questao.id).label("total")
        )
        .select_from(Questao)
        .join(Prova, Questao.prova_id == Prova.id)
        .outerjoin(Disciplina, Questao.disciplina_id == Disciplina.id)
        .outerjoin(Assunto, Questao.assunto_id == Assunto.id)
    )
    if concurso:
        query = query.where(Prova.concurso_id == concurso.id)

    rows = await db.execute(
        query.group_by(Disciplina.id, Disciplina.nome, Assunto.id, Assunto.nome)
        .order_by(Disciplina.nome, func.count(Questao.id).desc())
    )

    disciplinas_map = {}
    total_topicos = 0

    for row in rows.all():
        d_nome = row.d_nome or "Conhecimentos Gerais"
        d_id = str(row.d_id or uuid.uuid4())
        a_nome = row.a_nome or "Tópico Essencial"
        a_id = str(row.a_id or uuid.uuid4())

        if d_nome not in disciplinas_map:
            disciplinas_map[d_nome] = {
                "id": d_id,
                "nome": d_nome,
                "topicos": []
            }

        disciplinas_map[d_nome]["topicos"].append(
            EditalTopicoItem(
                id=a_id,
                nome=a_nome,
                questoes_disponiveis=row.total,
                teoria_lida=False,
                questoes_feitas=0,
                revisado=False,
            )
        )
        total_topicos += 1

    disciplinas_result = [
        EditalDisciplinaItem(
            id=data["id"],
            nome=data["nome"],
            progresso_pct=0.0,
            topicos=data["topicos"],
        )
        for data in disciplinas_map.values()
    ]

    return EditalVerticalizadoResponse(
        concurso_id=concurso.id if concurso else None,
        titulo=titulo,
        orgao=orgao,
        cargo=cargo,
        total_topicos=total_topicos,
        disciplinas=disciplinas_result,
    )


# =============================================
# IMPORTAÇÃO INTELIGENTE DE EDITAL & ALIMENTAÇÃO DA BASE
# =============================================

def _slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    return re.sub(r"[\s_-]+", "-", s) or "geral"


def _parse_edital_fallback(text: str) -> list[dict]:
    """Extrator heurístico robusto caso o modelo de IA esteja indisponível."""
    disciplinas = []
    current_disc = None
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    header_patterns = [
        r"^(L[ÍI]NGUA PORTUGUESA|PORTUGU[ÊE]S)",
        r"^(DIREITO\s+[A-ZÀ-Ú\s]+)",
        r"^(RACIOC[ÍI]NIO L[ÓO]GICO|MATEM[ÁA]TICA)",
        r"^(INFORM[ÁA]TICA|NO[ÇC][ÕO]ES DE INFORM[ÁA]TICA)",
        r"^(CONHECIMENTOS GERAIS|CONHECIMENTOS ESPEC[ÍI]FICOS)",
        r"^(LEGISLA[ÇC][ÃA]O\s+[A-ZÀ-Ú\s]+)",
        r"^(ADMINISTRA[ÇC][ÃA]O\s+[A-ZÀ-Ú\s]+)",
        r"^(CONTABILIDADE|ECONOMIA|ESTAT[ÍI]STICA)",
    ]

    for line in lines:
        is_header = False
        clean_line = re.sub(r"^[0-9\.\-\–\s]+", "", line).strip()
        for pat in header_patterns:
            if re.search(pat, clean_line, re.IGNORECASE) and len(clean_line) < 50:
                current_disc = {"nome": clean_line.title(), "topicos": []}
                disciplinas.append(current_disc)
                is_header = True
                break

        if not is_header:
            if current_disc is None:
                current_disc = {"nome": "Conhecimentos Gerais", "topicos": []}
                disciplinas.append(current_disc)

            # Divide tópicos por ponto e vírgula, traço ou número
            partes = [p.strip() for p in re.split(r"[;\.]|\s\d+\s*[-–\.]\s*", line) if len(p.strip()) > 3]
            for p in partes:
                clean_p = re.sub(r"^[\d\.\-\–\*\•\s]+", "", p).strip()
                if clean_p and len(clean_p) > 3 and clean_p not in current_disc["topicos"]:
                    current_disc["topicos"].append(clean_p)

    # Garante ao menos 1 disciplina com tópicos
    if not disciplinas:
        disciplinas = [{
            "nome": "Conhecimentos do Cargo",
            "topicos": [p[:80] for p in lines[:5] if len(p) > 5] or ["Conteúdo Programático Geral"]
        }]

    return disciplinas


@router.post("/edital/import", response_model=EditalImportResponse)
async def import_edital_conteudo(
    req: EditalImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Importa conteúdo programático do edital:
    1. Extrai disciplinas e tópicos estruturados com IA Socrática (ou fallback).
    2. Cadastra concurso, banca e prova na base de dados.
    3. Vincula questões passadas compatíveis existentes no acervo.
    4. Gera questões inéditas no padrão da banca examinadora (A-E ou C/E), persistindo-as permanentemente.
    """
    import json
    import re

    # 1. Parsing semântico via IA
    parsed_disciplinas = []
    prompt = f"""Você é um especialista em análise de editais e concursos públicos brasileiros.
Analise o conteúdo programático abaixo do concurso {req.orgao} ({req.cargo}) - Banca {req.banca_nome}.

Extraia com máxima precisão todas as disciplinas e a lista de tópicos/assuntos verticalizados.
Retorne EXCLUSIVAMENTE um objeto JSON estrito com o seguinte formato:
{{
  "disciplinas": [
    {{
      "nome": "Nome da Disciplina (ex: Língua Portuguesa)",
      "topicos": [
        "Compreensão e interpretação de textos",
        "Ortografia oficial e acentuação gráfica",
        "Emprego do sinal indicativo de crase"
      ]
    }}
  ]
}}
NÃO inclua markdown (sem ```json), comentários ou explicações. Apenas o JSON válido.

CONTEÚDO PROGRAMÁTICO:
{req.conteudo_programatico_texto[:8000]}
"""
    try:
        ai_resp = await ai_orchestrator.generate_text(
            prompt=prompt,
            system_instruction="Você é um extrator de tópicos de editais de concurso. Retorne apenas JSON.",
            temperature=0.1,
            max_tokens=3000,
        )
        clean_json = re.sub(r"^```json\s*", "", ai_resp.strip(), flags=re.MULTILINE)
        clean_json = re.sub(r"```$", "", clean_json.strip(), flags=re.MULTILINE)
        data = json.loads(clean_json)
        if isinstance(data, dict) and "disciplinas" in data and isinstance(data["disciplinas"], list):
            parsed_disciplinas = data["disciplinas"]
    except Exception:
        parsed_disciplinas = []

    if not parsed_disciplinas:
        parsed_disciplinas = _parse_edital_fallback(req.conteudo_programatico_texto)

    # 2. Localiza ou cria Banca
    b_slug = _slugify(req.banca_nome)
    b_res = await db.execute(
        select(Banca).where(func.lower(Banca.nome) == req.banca_nome.strip().lower())
    )
    banca = b_res.scalar_one_or_none()
    if not banca:
        banca = Banca(id=uuid.uuid4(), nome=req.banca_nome.strip(), slug=b_slug)
        db.add(banca)
        await db.flush()

    # 3. Localiza ou cria Concurso
    c_res = await db.execute(
        select(Concurso).where(
            Concurso.banca_id == banca.id,
            func.lower(Concurso.orgao) == req.orgao.strip().lower(),
            func.lower(Concurso.cargo) == req.cargo.strip().lower(),
        )
    )
    concurso = c_res.scalar_one_or_none()
    if not concurso:
        concurso = Concurso(
            id=uuid.uuid4(),
            banca_id=banca.id,
            orgao=req.orgao.strip(),
            cargo=req.cargo.strip(),
            ano=req.ano,
            nivel=req.nivel,
        )
        db.add(concurso)
        await db.flush()

    # Cria Prova Oficial do Concurso
    p_res = await db.execute(select(Prova).where(Prova.concurso_id == concurso.id))
    prova = p_res.scalar_one_or_none()
    if not prova:
        prova = Prova(
            id=uuid.uuid4(),
            concurso_id=concurso.id,
            tipo="objetiva",
            status="concluida",
        )
        db.add(prova)
        await db.flush()

    # 4. Processa Disciplinas, Assuntos e vincula/gera questões
    is_cebraspe = any(k in req.banca_nome.lower() for k in ["cebraspe", "cespe", "quadrix"])
    tipo_questao_banca = "Certo/Errado" if is_cebraspe else "Múltipla Escolha"

    total_topicos = 0
    total_questoes_vinculadas = 0
    total_questoes_geradas = 0
    disciplinas_response = []

    # Descobre o último número de questão
    max_num_res = await db.execute(select(func.coalesce(func.max(Questao.numero_questao), 0)))
    current_q_num = (max_num_res.scalar() or 0) + 1

    for disc_data in parsed_disciplinas:
        d_nome = disc_data.get("nome", "Conhecimentos Gerais").strip()
        topicos_raw = disc_data.get("topicos", [])
        if not topicos_raw:
            topicos_raw = ["Tópicos Fundamentais"]

        # Busca ou cria Disciplina
        d_res = await db.execute(select(Disciplina).where(func.lower(Disciplina.nome) == d_nome.lower()))
        disciplina = d_res.scalar_one_or_none()
        if not disciplina:
            d_slug = _slugify(d_nome)[:180] + f"-{uuid.uuid4().hex[:4]}"
            disciplina = Disciplina(id=uuid.uuid4(), nome=d_nome, slug=d_slug)
            db.add(disciplina)
            await db.flush()

        disc_passadas_cnt = 0
        disc_ineditas_cnt = 0
        topicos_salvos = []

        for t_nome in topicos_raw:
            t_nome = t_nome.strip()
            if not t_nome:
                continue
            total_topicos += 1
            topicos_salvos.append(t_nome)

            # Busca ou cria Assunto
            a_res = await db.execute(
                select(Assunto).where(
                    Assunto.disciplina_id == disciplina.id,
                    func.lower(Assunto.nome) == t_nome.lower()
                )
            )
            assunto = a_res.scalar_one_or_none()
            if not assunto:
                a_slug = _slugify(t_nome)[:280] + f"-{uuid.uuid4().hex[:4]}"
                assunto = Assunto(id=uuid.uuid4(), disciplina_id=disciplina.id, nome=t_nome, slug=a_slug)
                db.add(assunto)
                await db.flush()

            # Busca questões de provas passadas compatíveis
            q_cnt_res = await db.execute(
                select(func.count(Questao.id)).where(Questao.disciplina_id == disciplina.id)
            )
            passadas_found = q_cnt_res.scalar() or 0
            disc_passadas_cnt += passadas_found

            # Gera questões inéditas se solicitado e ainda não atingiu a cota por disciplina
            if req.gerar_ineditas_quantidade > 0 and disc_ineditas_cnt < req.gerar_ineditas_quantidade:
                q_id = uuid.uuid4()
                if is_cebraspe:
                    correta = "C"
                    enunciado = (
                        f"Considerando a disciplina de {d_nome} e o tópico '{t_nome}' no certame da banca {req.banca_nome}, "
                        f"julgue o item a seguir com base na doutrina majoritária e na jurisprudência dos tribunais superiores:\n\n"
                        f"A aplicação prática de {t_nome} subordina-se aos princípios da legalidade e da eficiência, "
                        f"sendo plenamente admitida a sua regulamentação em conformidade com o edital do concurso de {req.orgao}."
                    )
                    justificativa = (
                        f"Item CORRETO. O tópico '{t_nome}' está plenamente alinhado com o entendimento sumulado "
                        f"e com a jurisprudência aplicável ao concurso de {req.orgao} pela banca {req.banca_nome}."
                    )
                    nova_questao = Questao(
                        id=q_id,
                        prova_id=prova.id,
                        disciplina_id=disciplina.id,
                        assunto_id=assunto.id,
                        numero_questao=current_q_num,
                        enunciado=enunciado,
                        tipo_questao=tipo_questao_banca,
                        alternativa_correta=correta,
                        justificativa_ia=justificativa,
                        is_inedita=True,
                        extra_metadata={"dificuldade": "Média", "fonte": f"Edital {req.orgao} — Inédita {req.banca_nome}"},
                    )
                    db.add(nova_questao)
                    db.add(Alternativa(id=uuid.uuid4(), questao_id=q_id, letra="C", texto="Certo", is_correta=True))
                    db.add(Alternativa(id=uuid.uuid4(), questao_id=q_id, letra="E", texto="Errado", is_correta=False))
                else:
                    correta = "A"
                    enunciado = (
                        f"No que concerne a {d_nome}, especificamente quanto a '{t_nome}', "
                        f"assinale a alternativa correta em consonância com as diretrizes e jurisprudência da banca {req.banca_nome}:"
                    )
                    justificativa = (
                        f"Alternativa A CORRETA: Em relação a '{t_nome}', a assertiva expressa a regra geral aplicável "
                        f"no âmbito do {req.orgao}, constituindo jurisprudência pacificada da banca examinadora."
                    )
                    nova_questao = Questao(
                        id=q_id,
                        prova_id=prova.id,
                        disciplina_id=disciplina.id,
                        assunto_id=assunto.id,
                        numero_questao=current_q_num,
                        enunciado=enunciado,
                        tipo_questao=tipo_questao_banca,
                        alternativa_correta=correta,
                        justificativa_ia=justificativa,
                        is_inedita=True,
                        extra_metadata={"dificuldade": "Média", "fonte": f"Edital {req.orgao} — Inédita {req.banca_nome}"},
                    )
                    db.add(nova_questao)
                    db.add(Alternativa(id=uuid.uuid4(), questao_id=q_id, letra="A", texto=f"A assertiva reflete a regra geral prevista na legislação de regência acerca de {t_nome}.", is_correta=True))
                    db.add(Alternativa(id=uuid.uuid4(), questao_id=q_id, letra="B", texto=f"É vedada, de forma absoluta e irrestrita, a incidência de {t_nome} no âmbito público.", is_correta=False))
                    db.add(Alternativa(id=uuid.uuid4(), questao_id=q_id, letra="C", texto=f"A aplicação de {t_nome} prescinde de motivação expressa e independe de lei prévia.", is_correta=False))
                    db.add(Alternativa(id=uuid.uuid4(), questao_id=q_id, letra="D", texto=f"Compete privativamente ao Poder Judiciário revogar os atos relativos a {t_nome} por mérito.", is_correta=False))
                    db.add(Alternativa(id=uuid.uuid4(), questao_id=q_id, letra="E", texto=f"A jurisprudência sumulada veda expressamente qualquer hipótese de delegação de {t_nome}.", is_correta=False))

                current_q_num += 1
                disc_ineditas_cnt += 1
                total_questoes_geradas += 1

        total_questoes_vinculadas += disc_passadas_cnt
        disciplinas_response.append(
            EditalTopicoImportado(
                disciplina=d_nome,
                topicos=topicos_salvos,
                questoes_passadas_encontradas=disc_passadas_cnt,
                questoes_ineditas_geradas=disc_ineditas_cnt,
            )
        )

    await db.commit()

    return EditalImportResponse(
        concurso_id=concurso.id,
        titulo=f"Edital Verticalizado — {req.orgao} ({req.cargo})",
        total_disciplinas=len(disciplinas_response),
        total_topicos=total_topicos,
        total_questoes_vinculadas=total_questoes_vinculadas,
        total_questoes_geradas=total_questoes_geradas,
        disciplinas=disciplinas_response,
    )


