"""
Router de Skills IA Especializadas — Plataforma de Concursos Públicos

Endpoints de ferramentas táticas cognitivas:
  - POST /api/skills/super-pesquisa
  - POST /api/skills/engenharia-reversa
  - POST /api/skills/debate-multiagente
  - POST /api/skills/token-reducer
  - POST /api/skills/auditor-pegadinha
  - GET  /api/skills/presets
"""

from fastapi import APIRouter, HTTPException, status
from loguru import logger

from src.schemas import (
    SuperPesquisaRequest,
    SuperPesquisaResponse,
    EngenhariaReversaRequest,
    EngenhariaReversaResponse,
    DebateMultiagenteRequest,
    DebateMultiagenteResponse,
    TokenReducerRequest,
    TokenReducerResponse,
    AuditorPegadinhaRequest,
    AuditorPegadinhaResponse,
    SkillsCatalogResponse,
    SkillPresetItem,
)
from src.services.ai_orchestrator import ai_orchestrator, evaluate_prompt_security

router = APIRouter(prefix="/api/skills", tags=["Skills IA Táticas"])


# =========================================================================
# CATÁLOGO DE PRESETS RÁPIDOS (1-CLICK EXAMPLES)
# =========================================================================

PRESETS_CATALOG: list[SkillPresetItem] = [
    SkillPresetItem(
        id="preset-pesquisa-1",
        skill_id="super-pesquisa",
        titulo="Responsabilidade Civil Objetiva do Estado e Nexo Causal",
        descricao="Varredura de Súmulas do STF/STJ, divergência doutrinária e pegadinhas clássicas sobre o art. 37, § 6º da CF/88.",
        banca="Cebraspe",
        payload_exemplo={
            "tema": "Responsabilidade Civil Objetiva do Estado, excludentes de nexo causal e dano por omissão (teoria do risco administrativo)",
            "banca": "Cebraspe",
            "carreira": "Jurídica / Policial",
        },
    ),
    SkillPresetItem(
        id="preset-pesquisa-2",
        skill_id="super-pesquisa",
        titulo="Dolo Específico na Nova Lei de Improbidade (Lei 14.230/21)",
        descricao="Análise das mudanças legislativas e posicionamento do STF no Tema 1.199 da Repercussão Geral.",
        banca="FGV",
        payload_exemplo={
            "tema": "Improbidade Administrativa: dolo específico, extinção da modalidade culposa e retroatividade da Lei 14.230/2021 (Tema 1.199 STF)",
            "banca": "FGV",
            "carreira": "Controle / Fiscal",
        },
    ),
    SkillPresetItem(
        id="preset-reversa-1",
        skill_id="engenharia-reversa",
        titulo="Desmonte de Pegadinha de Competência Constitucional",
        descricao="Disseca questão complexa da FGV que induz confusão entre competência privativa e concorrente.",
        banca="FGV",
        payload_exemplo={
            "enunciado": "Determinado Estado da Federação promulgou lei estabelecendo diretrizes e bases da educação infantil e do ensino fundamental em seu território, fixando currículo mínimo obrigatório distinto das diretrizes nacionais. Em face da repartição constitucional de competências legislativas, a referida norma estadual padece de inconstitucionalidade formal orgânica.",
            "banca": "FGV",
            "gabarito_oficial": "Correto / Inconstitucional",
            "alternativas": [
                "A) É constitucional, pois a educação infantil insere-se na competência suplementar do Estado membro.",
                "B) Padece de inconstitucionalidade formal orgânica, pois legislar sobre diretrizes e bases da educação nacional é competência privativa da União (CF, art. 22, XXIV).",
                "C) É válida desde que referendada pelo Conselho Estadual de Educação.",
                "D) Não padece de vício por tratar de interesse puramente local.",
            ],
        },
    ),
    SkillPresetItem(
        id="preset-debate-1",
        skill_id="debate-multiagente",
        titulo="Mesa Redonda: Princípio da Insignificância no Furto Qualificado",
        descricao="Confronto em rodadas entre Normativista da Lei Seca, Jurisconsulto dos Tribunais (STF/STJ) e Doutrinador Penal.",
        banca="Cebraspe",
        payload_exemplo={
            "tema_ou_questao": "É cabível a incidência do princípio da insignificância ao crime de furto qualificado pelo concurso de pessoas ou mediante rompimento de obstáculo? Confronto entre súmula do STJ e teses mais recentes da 2ª Turma do STF.",
            "banca": "Cebraspe",
        },
    ),
    SkillPresetItem(
        id="preset-token-1",
        skill_id="token-reducer",
        titulo="Condensador Mnemônico: Art. 5º da CF/88 (Garantias Fundamentais)",
        descricao="Comprime 15 incisos prolixos em regras-chave, exceções obrigatórias e mnemônicos de alta retenção.",
        banca="Todas",
        payload_exemplo={
            "texto_bruto": (
                "A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, "
                "salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial. "
                "É inviolável o sigilo da correspondência e das comunicações telegráficas, de dados e das comunicações telefônicas, "
                "salvo, no último caso, por ordem judicial, nas hipóteses e na forma que a lei estabelecer para fins de investigação criminal "
                "ou instrução processual penal. Ninguém será privado de direitos por motivo de crença religiosa ou de convicção filosófica ou política, "
                "salvo se as invocar para eximir-se de obrigação legal a todos imposta e recusar-se a cumprir prestação alternativa, fixada em lei."
            ),
            "nivel_compressao": "alto",
        },
    ),
    SkillPresetItem(
        id="preset-auditor-1",
        skill_id="auditor-pegadinha",
        titulo="Auditoria Anti-Pegadinha de Direito Administrativo (Cebraspe)",
        descricao="Detecta termos absolutistas e calcula o risco de indução ao erro em assertiva capciosa.",
        banca="Cebraspe",
        payload_exemplo={
            "texto_questao": (
                "O ato administrativo praticado com desvio de finalidade pode ser convalidado pela autoridade superior "
                "a qualquer tempo, desde que demonstrada a ausência de prejuízo ao erário, prescindindo de prévia oitiva do administrado "
                "em qualquer hipótese fática."
            ),
            "banca": "Cebraspe",
        },
    ),
]


# =========================================================================
# ENDPOINTS DAS SKILLS
# =========================================================================

@router.get("/presets", response_model=SkillsCatalogResponse)
async def listar_presets_skills():
    """Retorna os presets prontos com exemplos práticos de 1 clique para testar as Skills IA."""
    return SkillsCatalogResponse(presets=PRESETS_CATALOG)


@router.post("/super-pesquisa", response_model=SuperPesquisaResponse)
async def executar_skill_super_pesquisa(payload: SuperPesquisaRequest):
    """
    Skill 1: SuperAgente de Jurisprudência & Pesquisa Profunda.
    Pesquisa exaustiva de Súmulas Vinculantes, teses de repercussão geral, divergência doutrinária e armadilhas da banca.
    """
    sec = evaluate_prompt_security(payload.tema)
    if not sec["safe"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=sec["reason"])

    try:
        resultado = await ai_orchestrator.executar_super_pesquisa(
            tema=payload.tema,
            banca=payload.banca,
            carreira=payload.carreira,
        )
        return SuperPesquisaResponse(**resultado)
    except Exception as e:
        logger.error(f"Erro ao executar SuperPesquisa: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível concluir a pesquisa jurídica profunda no momento.",
        )


@router.post("/engenharia-reversa", response_model=EngenhariaReversaResponse)
async def executar_skill_engenharia_reversa(payload: EngenhariaReversaRequest):
    """
    Skill 2: Engenharia Reversa de Questões da Banca.
    Disseca a anatomia da questão, nível de Bloom, armadilhas cognitivas e sintetiza questões inéditas clones.
    """
    sec = evaluate_prompt_security(payload.enunciado)
    if not sec["safe"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=sec["reason"])

    try:
        resultado = await ai_orchestrator.executar_engenharia_reversa(
            enunciado=payload.enunciado,
            banca=payload.banca,
            gabarito=payload.gabarito_oficial,
            alternativas=payload.alternativas,
        )
        return EngenhariaReversaResponse(**resultado)
    except Exception as e:
        logger.error(f"Erro ao executar Engenharia Reversa: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível concluir a engenharia reversa da questão no momento.",
        )


@router.post("/debate-multiagente", response_model=DebateMultiagenteResponse)
async def executar_skill_debate_multiagente(payload: DebateMultiagenteRequest):
    """
    Skill 3: Tribunal Multiagente em Debate.
    Mesa redonda entre Guardião da Lei Seca, Jurisconsulto dos Tribunais e Doutrinador Clássico,
    com réplica e veredito final do Relator.
    """
    sec = evaluate_prompt_security(payload.tema_ou_questao)
    if not sec["safe"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=sec["reason"])

    try:
        resultado = await ai_orchestrator.executar_debate_multiagente(
            tema_ou_questao=payload.tema_ou_questao,
            banca=payload.banca,
        )
        return DebateMultiagenteResponse(**resultado)
    except Exception as e:
        logger.error(f"Erro ao executar Debate Multiagente: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível orquestrar o debate multiagente no momento.",
        )


@router.post("/token-reducer", response_model=TokenReducerResponse)
async def executar_skill_token_reducer(payload: TokenReducerRequest):
    """
    Skill 4: Token Reducer Neural (Compressor Mnemônico de Alta Densidade).
    Comprime textos longos e leis secas em 60-80%, gerando mnemônicos e mapas conceituais.
    """
    sec = evaluate_prompt_security(payload.texto_bruto)
    if not sec["safe"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=sec["reason"])

    try:
        resultado = await ai_orchestrator.executar_token_reducer(
            texto_bruto=payload.texto_bruto,
            nivel_compressao=payload.nivel_compressao,
        )
        return TokenReducerResponse(**resultado)
    except Exception as e:
        logger.error(f"Erro ao executar Token Reducer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível processar a compressão de texto no momento.",
        )


@router.post("/auditor-pegadinha", response_model=AuditorPegadinhaResponse)
async def executar_skill_auditor_pegadinha(payload: AuditorPegadinhaRequest):
    """
    Skill 5: Firewall Cognitivo & Auditor Anti-Pegadinhas da Banca.
    Avalia a periculosidade do enunciado, termos armadilha e entrega o antídoto prático para o aluno.
    """
    sec = evaluate_prompt_security(payload.texto_questao)
    if not sec["safe"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=sec["reason"])

    try:
        resultado = await ai_orchestrator.executar_auditor_pegadinhas(
            texto_questao=payload.texto_questao,
            banca=payload.banca,
        )
        return AuditorPegadinhaResponse(**resultado)
    except Exception as e:
        logger.error(f"Erro ao executar Auditor de Pegadinhas: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível auditar a questão no momento.",
        )
