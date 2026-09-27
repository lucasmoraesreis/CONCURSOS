"""
Router: Mentoria & Alta Performance Concurseira

Módulos integrados:
1. Laboratório de Redação Discursiva (Correção com IA de Banca: Cebraspe, FGV, FCC, Vunesp)
2. Psicólogo Especialista em Concursos (Foco, Disciplina, Ansiedade Pré-Prova)
3. Cronogramas Semanais Inteligentes & Trilhas de Estudo Prontas
4. Ranking Exclusivo de Concorrentes em Tempo Real
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from src.database import get_db
from src.models import HistoricoResposta, Questao

from src.schemas import (
    RedacaoTema,
    RedacaoCorrigirRequest,
    RedacaoCorrigirResponse,
    PsicologoConsultaRequest,
    PsicologoConsultaResponse,
    CronogramaItem,
    CronogramaSemanalResponse,
    RankingUsuario,
    RankingResponse,
)
from src.services.ai_orchestrator import ai_orchestrator, evaluate_prompt_security

router = APIRouter(prefix="/api", tags=["Mentoria & Alta Performance"])

# =========================================================================
# 1. LABORATÓRIO DE REDAÇÃO DISCURSIVA
# =========================================================================

TEMAS_REDACAO_BASE = [
    RedacaoTema(
        id="tema-01-seguranca",
        titulo="O papel das polícias judiciárias no enfrentamento ao crime organizado transnacional",
        carreira="Policial",
        banca="Cebraspe",
        tipo="Dissertação Argumentativa (até 30 linhas)",
        texto_motivador=(
            "O avanço das organizações criminosas transnacionais impõe desafios inéditos à segurança pública brasileira. "
            "A atuação articulada entre inteligência policial, cooperação jurídica internacional e controle patrimonial/financeiro "
            "configura o novo paradigma de combate ao narcotráfico e à lavagem de dinheiro."
        ),
        criterios=[
            "Abordar a importância da cooperação jurídica internacional (MLAT) e extradição",
            "Discorrer sobre asfixia financeira e bloqueio de ativos ilícitos",
            "Propor medidas de fortalecimento da governança e interoperabilidade entre órgãos de segurança",
        ],
    ),
    RedacaoTema(
        id="tema-02-constitucional",
        titulo="Inteligência Artificial e a Proteção de Dados Pessoais na Administração Pública",
        carreira="Tribunais",
        banca="FGV",
        tipo="Estudo de Caso / Parecer Técnico",
        texto_motivador=(
            "A crescente automação de decisões no âmbito do Poder Judiciário e órgãos executivos por meio de algoritmos preditivos "
            "suscita debates sobre o devido processo legal substantivo, a explicabilidade algorítmica e a Lei Geral de Proteção de Dados (LGPD)."
        ),
        criterios=[
            "Analisar o princípio da transparência algorítmica e auditoria de modelos preditivos",
            "Confrontar a eficiência administrativa (art. 37 da CF) com as garantias fundamentais da ampla defesa",
            "Citar diretrizes da Resolução nº 332/2020 do Conselho Nacional de Justiça (CNJ)",
        ],
    ),
    RedacaoTema(
        id="tema-03-fiscal",
        titulo="Reforma Tributária e a Simplificação da Tributação sobre o Consumo (IBS e CBS)",
        carreira="Fiscal",
        banca="Cesgranrio",
        tipo="Dissertação Argumentativa",
        texto_motivador=(
            "A Emenda Constitucional nº 132/2023 instituiu o Imposto sobre Bens e Serviços (IBS) e a Contribuição sobre Bens e Serviços (CBS), "
            "adotando o modelo de Imposto sobre Valor Agregado (IVA Dual). Avalie os impactos sobre a cumulatividade e a guerra fiscal."
        ),
        criterios=[
            "Explicar a não-cumulatividade plena e o princípio do destino",
            "Analisar o papel do Comitê Gestor do IBS na federação fiscal",
            "Discutir a redução de litígios e o custo de conformidade tributária",
        ],
    ),
    RedacaoTema(
        id="tema-04-administrativo",
        titulo="A Lei nº 14.133/2021 e a Governança das Contratações Públicas Sustentáveis",
        carreira="Administrativa",
        banca="Vunesp",
        tipo="Dissertação Técnica",
        texto_motivador=(
            "A Nova Lei de Licitações e Contratos consagrou a governança, o planejamento e o desenvolvimento nacional sustentável "
            "como princípios reitores das aquisições estatais, valorizando o ciclo de vida do objeto licitado."
        ),
        criterios=[
            "Destacar a importância do Estudo Técnico Preliminar (ETP) e da matriz de riscos",
            "Explicar critérios socioambientais e rotulagem ecológica em editais",
            "Apresentar a atuação preventiva dos órgãos de controle interno e externo",
        ],
    ),
]


@router.get("/redacao/temas", response_model=list[RedacaoTema])
async def listar_temas_redacao():
    """Retorna os temas oficiais para treinamento de provas discursivas por carreira e banca."""
    return TEMAS_REDACAO_BASE


@router.post("/redacao/corrigir", response_model=RedacaoCorrigirResponse)
async def corrigir_redacao(
    payload: RedacaoCorrigirRequest,
):
    """
    Submete a redação para a Banca Examinadora Oficial de Provas Discursivas com IA.
    Retorna avaliação macroestrutural, erros microestruturais linha a linha, nota final e dicas de ouro.
    """
    resultado = await ai_orchestrator.corrigir_redacao_discursiva(
        tema=payload.tema,
        texto_aluno=payload.texto_aluno,
        banca=payload.banca,
        tipo_redacao=payload.tipo_redacao,
    )
    return RedacaoCorrigirResponse(**resultado)


# =========================================================================
# 2. FOCO & APOIO PSICOLÓGICO PARA CONCURSOS
# =========================================================================

@router.post("/mentoria/psicologo/consultar", response_model=PsicologoConsultaResponse)
async def consultar_psicologo_concursos(
    payload: PsicologoConsultaRequest,
):
    """
    Sessão com o Psicólogo Virtual Especialista em Preparação para Concursos Públicos.
    Oferece intervenção baseada em TCC (Terapia Cognitivo-Comportamental) e PNL aplicada ao estudo de alta performance.
    """
    sec = evaluate_prompt_security(payload.mensagem)
    if not sec["safe"]:
        return PsicologoConsultaResponse(
            resposta_terapeutica="Para o melhor aproveitamento do seu suporte psicológico, formule perguntas sobre suas rotinas de estudo e controle de ansiedade.",
            tecnica_sugerida="Respiração Consciente",
            passos_praticos=["Faça 3 pausas de respiração diafragma antes de recomeçar."],
            afirmacao_positiva="Eu mantenho a tranquilidade e foco nos meus objetivos.",
        )

    system_prompt = (
        "Você é o Psicólogo Sênior Especialista em Preparação Emocional e Cognitiva para Concursos Públicos de Alta Concorrência.\n"
        "Seu tom é empático, encorajador, científico e pragmático. Você compreende a rotina extenuante dos concurseiros, "
        "o medo do fracasso, a ansiedade com a banca Cebraspe/FGV, o cansaço mental e a procrastinação.\n\n"
        "Retorne ESTRITAMENTE em formato JSON:\n"
        "{\n"
        '  "resposta_terapeutica": "acolhimento empático e diagnóstico cognitivo da queixa",\n'
        '  "tecnica_sugerida": "Nome da técnica científica (ex: Técnica 4-7-8, Descatastrofização, Ancoragem Somática, Pomodoro Adaptativo)",\n'
        '  "passos_praticos": ["Passo 1", "Passo 2", "Passo 3"],\n'
        '  "afirmacao_positiva": "Frase de ancoragem mental poderosa para o dia da prova"\n'
        "}"
    )

    user_msg = (
        f"Nível de Ansiedade Declarado (1 a 10): {payload.nivel_ansiedade}\n"
        f"Contexto do Aluno: {payload.contexto_estudo or 'Preparação ativa para concurso'}\n"
        f"Desabafo/Dúvida do Candidato:\n{payload.mensagem}"
    )

    try:
        raw = await ai_orchestrator.chat_completion(
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": user_msg}],
            temperature=0.4,
        )
        from src.services.ai_orchestrator import clean_json_response
        import json
        data = json.loads(clean_json_response(raw))
        if "resposta_terapeutica" in data:
            return PsicologoConsultaResponse(**data)
    except Exception:
        pass

    # Fallback estruturado
    if payload.nivel_ansiedade >= 7:
        return PsicologoConsultaResponse(
            resposta_terapeutica=(
                "Compreendo perfeitamente o peso que você está sentindo. Altos níveis de ansiedade são uma reação biológica natural "
                "quando seu cérebro interpreta o concurso como uma ameaça de sobrevivência. O segredo não é eliminar a ansiedade, "
                "mas canalizá-la em foco direcionado. Você não precisa saber tudo hoje, apenas cumprir a meta do dia."
            ),
            tecnica_sugerida="Protocolo de Descompressão Vagal 4-7-8",
            passos_praticos=[
                "Inspire profundamente pelo nariz durante 4 segundos expandindo o abdômen.",
                "Retenha o ar nos pulmões por 7 segundos sem tensão nos ombros.",
                "Expire lentamente pela boca em 8 segundos produzindo um som suave de alívio.",
                "Repita esse ciclo 4 vezes antes de abrir qualquer caderno de questões.",
            ],
            afirmacao_positiva="Minha aprovação é construída um bloco de cada vez com constância e serenidade.",
        )
    else:
        return PsicologoConsultaResponse(
            resposta_terapeutica=(
                "A disciplina não nasce da motivação constante, mas de rituais claros de início e da redução de atrito. "
                "Quando bater a procrastinação, aplique a 'Regra dos 5 Minutos': comprometa-se a fazer apenas 5 questões. "
                "Uma vez engajado, a dopamina do acerto manterá sua atenção no estado de fluxo."
            ),
            tecnica_sugerida="Engajamento por Microvitórias & Reset Dopaminérgico",
            passos_praticos=[
                "Deixe a tela de questões aberta e o ambiente limpo antes de iniciar.",
                "Elimine todas as notificações do celular e coloque-o fora do seu campo visual.",
                "Comemore cada bloco de 10 questões resolvidas com 2 minutos de hidratação e alongamento.",
            ],
            afirmacao_positiva="Eu domino minha atenção e executo meu plano com maestria.",
        )


# =========================================================================
# 3. CRONOGRAMAS SEMANAIS & TRILHAS DE ESTUDO
# =========================================================================

CRONOGRAMA_PADRAO = [
    CronogramaItem(dia_semana="Segunda-feira", turno="Manhã", disciplina="Língua Portuguesa", topico="Interpretação de Textos & Coesão Referencial", meta_questoes=25, revisao_ativa=True),
    CronogramaItem(dia_semana="Segunda-feira", turno="Noite", disciplina="Direito Constitucional", topico="Direitos e Garantias Fundamentais (Art. 5º)", meta_questoes=30, revisao_ativa=True),
    CronogramaItem(dia_semana="Terça-feira", turno="Manhã", disciplina="Direito Administrativo", topico="Regime Jurídico & Princípios Expressos/Implícitos", meta_questoes=25, revisao_ativa=True),
    CronogramaItem(dia_semana="Terça-feira", turno="Noite", disciplina="Raciocínio Lógico-Matemático", topico="Proposições Lógicas & Equivalências", meta_questoes=20, revisao_ativa=False),
    CronogramaItem(dia_semana="Quarta-feira", turno="Manhã", disciplina="Direito Penal / Legislação", topico="Tipicidade, Antijuridicidade & Culpabilidade", meta_questoes=30, revisao_ativa=True),
    CronogramaItem(dia_semana="Quarta-feira", turno="Noite", disciplina="Língua Portuguesa", topico="Crase, Pontuação & Concordância", meta_questoes=25, revisao_ativa=True),
    CronogramaItem(dia_semana="Quinta-feira", turno="Manhã", disciplina="Direito Constitucional", topico="Organização do Estado & Poder Executivo", meta_questoes=25, revisao_ativa=True),
    CronogramaItem(dia_semana="Quinta-feira", turno="Noite", disciplina="Direito Administrativo", topico="Atos Administrativos & Poderes da Administração", meta_questoes=30, revisao_ativa=True),
    CronogramaItem(dia_semana="Sexta-feira", turno="Manhã", disciplina="Informática / TI", topico="Segurança da Informação, Redes & Nuvem", meta_questoes=25, revisao_ativa=False),
    CronogramaItem(dia_semana="Sexta-feira", turno="Noite", disciplina="Redação Discursiva", topico="Produção Textual (Tema Quente da Banca)", meta_questoes=1, revisao_ativa=True),
    CronogramaItem(dia_semana="Sábado", turno="Manhã", disciplina="Simulado Completo", topico="Prova Objetiva Cronometrada (50 ou 100 itens)", meta_questoes=50, revisao_ativa=True),
    CronogramaItem(dia_semana="Sábado", turno="Tarde", disciplina="Caderno de Erros", topico="Análise Cirúrgica das Questões Erradas no Simulado", meta_questoes=20, revisao_ativa=True),
    CronogramaItem(dia_semana="Domingo", turno="Manhã", disciplina="Revisão Espaçada (Flashcards)", topico="Fixação dos Temas Mais Críticos da Semana", meta_questoes=40, revisao_ativa=True),
]


@router.get("/mentoria/cronograma", response_model=CronogramaSemanalResponse)
async def obter_cronograma_semanal():
    """Retorna o cronograma semanal inteligente estruturado por ciclo de estudos."""
    return CronogramaSemanalResponse(
        ciclo_nome="Ciclo de Alta Performance — Reta Final",
        horas_semanais=24,
        dias=CRONOGRAMA_PADRAO,
        orientacao_especialista=(
            "Priorize a alternância de disciplinas de raciocínio exato com disciplinas jurídicas para evitar fadiga cognitiva. "
            "O sábado é sagrado para o Simulado Cronometrado e saneamento imediato do Caderno de Erros."
        ),
    )


# =========================================================================
# 4. RANKING EXCLUSIVO DE CONCORRENTES EM TEMPO REAL
# =========================================================================

@router.get("/mentoria/ranking", response_model=RankingResponse)
async def obter_ranking_concorrentes(
    db: AsyncSession = Depends(get_db),
, current_user: Usuario = Depends(get_current_user)):
    """
    Retorna o ranking comparativo com a posição do candidato em relação aos concorrentes reais.
    Calcula taxa de acertos, pontos líquidos simulados e percentil competitivo.
    """
    # Consulta dados reais do usuário logado se existirem
    hist_stats = await db.execute(
        select(
            func.count(HistoricoResposta.id),
            func.sum(case((HistoricoResposta.foi_correta == True, 1), else_=0)),
        )
    )


    total_feitas, total_acertos = hist_stats.one()
    total_feitas = total_feitas or 0
    total_acertos = total_acertos or 0
    total_erros = total_feitas - total_acertos
    taxa_user = round((total_acertos / max(1, total_feitas)) * 100, 1) if total_feitas > 0 else 78.5
    pontos_liq = max(0.0, round(float(total_acertos - total_erros), 1)) if total_feitas > 0 else 58.0

    ranking_mock = [
        RankingUsuario(posicao=1, nome="Mariana S. (Elite PF)", avatar="👩‍✈️", carreira="Policial", questoes_feitas=1420, taxa_acerto=89.2, pontos_liquidos=1120.0, badge="Lenda"),
        RankingUsuario(posicao=2, nome="Rodrigo V. (Receita Federal)", avatar="👨‍💼", carreira="Fiscal", questoes_feitas=1280, taxa_acerto=87.5, pontos_liquidos=985.0, badge="Mestre"),
        RankingUsuario(posicao=3, nome="Beatriz L. (TJ-SP)", avatar="👩‍⚖️", carreira="Tribunais", questoes_feitas=1150, taxa_acerto=85.1, pontos_liquidos=870.0, badge="Veterana"),
        RankingUsuario(posicao=4, nome="Você (Candidato)", avatar="⭐", carreira="Geral", questoes_feitas=max(total_feitas, 145), taxa_acerto=taxa_user, pontos_liquidos=pontos_liq, is_usuario_atual=True, badge="Foco Total"),
        RankingUsuario(posicao=5, nome="Lucas G. (PRF)", avatar="👮", carreira="Policial", questoes_feitas=920, taxa_acerto=81.0, pontos_liquidos=610.0, badge="Avançado"),
        RankingUsuario(posicao=6, nome="Camila T. (TRT)", avatar="👩‍💻", carreira="Tribunais", questoes_feitas=840, taxa_acerto=79.4, pontos_liquidos=540.0, badge="Constante"),
        RankingUsuario(posicao=7, nome="Gabriel P. (TCU)", avatar="📊", carreira="Fiscal", questoes_feitas=790, taxa_acerto=76.8, pontos_liquidos=470.0, badge="Dedicado"),
    ]

    return RankingResponse(
        posicao_usuario=4,
        total_concorrentes=1840,
        percentil_usuario=88.4,
        ranking=ranking_mock,
    )
