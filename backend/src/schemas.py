"""
Pydantic schemas para serialização de responses da API.
"""

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


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
    dificuldade: str | None = None
    nivel: str | None = None
    area_atuacao: str | None = None
    fonte: str | None = None
    is_favorita: bool = False
    respondida_vezes: int = 0
    acertos: int = 0
    erros: int = 0
    proxima_revisao: datetime | None = None
    anotacao: str | None = None

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
    banca: str = Field(..., max_length=100)
    disciplina: str = Field(..., max_length=150)
    assunto: str = Field(..., max_length=200)
    tipo_questao: str | None = Field("Múltipla Escolha", max_length=50)
    dificuldade: str | None = Field("Médio", max_length=50)
    provider: str | None = Field("auto", max_length=50)
    quantidade: int | None = Field(1, ge=1, le=5)


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
    provider_used: str | None = None


# =============================================
# OPÇÕES DINÂMICAS PARA FILTROS AVANÇADOS
# =============================================

class FiltroItem(BaseModel):
    id: UUID | str
    nome: str


class AssuntoFiltroItem(BaseModel):
    id: UUID | str
    nome: str
    disciplina_id: UUID | str


class ConcursoFiltroItem(BaseModel):
    id: UUID | str
    nome: str
    orgao: str
    cargo: str
    ano: int
    nivel: str
    banca_id: UUID | str
    banca_nome: str
    total_questoes: int = 0


class FiltrosOpcoesResponse(BaseModel):
    concursos: list[ConcursoFiltroItem] = []
    disciplinas: list[FiltroItem]
    assuntos: list[AssuntoFiltroItem]
    bancas: list[FiltroItem]
    instituicoes: list[str]
    anos: list[int]
    cargos: list[str]
    niveis: list[str]
    areas_formacao: list[str]
    areas_atuacao: list[str]
    modalidades: list[str]
    dificuldades: list[str]


# =============================================
# ESTUDO, DESEMPENHO E COBERTURA
# =============================================

class StudyKpi(BaseModel):
    label: str
    value: int | float | str
    detail: str | None = None


class PerformanceSlice(BaseModel):
    nome: str
    total: int
    acertos: int
    erros: int
    taxa_acerto: float


class StudyDashboardResponse(BaseModel):
    kpis: list[StudyKpi]
    desempenho_por_disciplina: list[PerformanceSlice]
    desempenho_por_banca: list[PerformanceSlice]
    erros_recentes: list[QuestaoResponse]
    revisoes_pendentes: list[QuestaoResponse]


class StudyAnswerRequest(BaseModel):
    questao_id: UUID
    alternativa: str = Field(..., max_length=10)
    tempo_segundos: int = Field(0, ge=0, le=86400)


class StudyAnswerResponse(BaseModel):
    correta: bool
    alternativa_correta: str | None
    next_review_at: datetime | None = None
    review_stage: int
    answered_count: int
    correct_count: int
    wrong_count: int
    tipo_erro: str | None = None
    diagnostico_erro: str | None = None
    mapa_mental_mermaid: str | None = None


# =============================================
# GAMIFICAÇÃO, LIGAS E CONQUISTAS
# =============================================

class BadgeItem(BaseModel):
    id: str
    titulo: str
    descricao: str
    icone: str
    categoria: str
    unlocked: bool
    progresso_pct: float = 0.0
    data_desbloqueio: str | None = None


class LeagueStatus(BaseModel):
    nome: str
    nivel: int
    xp_atual: int
    xp_proximo_nivel: int
    icone: str
    cor: str
    posicao_ranking: int


class GamificationProfileResponse(BaseModel):
    xp_total: int
    liga: LeagueStatus
    badges: list[BadgeItem]
    conquistas_total: int
    conquistas_desbloqueadas: int


class StudyNoteRequest(BaseModel):
    note: str = Field(..., max_length=5000)


class StudyReportRequest(BaseModel):
    issue: str = Field(..., max_length=2000)


class StudyStateResponse(BaseModel):
    questao_id: UUID
    is_favorite: bool
    note: str | None = None
    reported_issue: str | None = None


class StudyPlanItem(BaseModel):
    disciplina_id: UUID | str | None = None
    disciplina: str
    questoes: int
    meta_diaria: int
    revisoes_semanais: int
    prioridade: str


class StudyPlanResponse(BaseModel):
    concurso_id: UUID | None = None
    titulo: str
    total_questoes: int
    dias_estimados: int
    questoes_por_dia: int
    itens: list[StudyPlanItem]


class SmartSimuladoResponse(BaseModel):
    titulo: str
    total: int
    items: list[QuestaoResponse]


class CoverageByGroup(BaseModel):
    nome: str
    concursos: int
    concursos_com_questoes: int
    questoes: int
    cobertura_pct: float


class CoverageResponse(BaseModel):
    concursos_total: int
    concursos_com_questoes: int
    concursos_sem_questoes: int
    provas_sem_questoes: int
    questoes_total: int
    alternativas_total: int
    questoes_sem_alternativas: int
    fontes: list[StudyKpi]
    por_banca: list[CoverageByGroup]
    por_nivel: list[CoverageByGroup]


# =============================================
# TUTOR IA SOCRÁTICO
# =============================================

class TutorChatRequest(BaseModel):
    questao_id: UUID
    pergunta: str = Field(..., min_length=1, max_length=2000)
    historico: list[dict] = Field(default_factory=list)
    modo: str = Field("socratico", max_length=30)  # "socratico" ou "direto"


class TutorChatResponse(BaseModel):
    resposta: str
    dica: str | None = None
    citacao_lei: str | None = None
    artigos_relevantes: list[str] = []


# =============================================
# OFENSIVA DIÁRIA (STREAKS) E METAS
# =============================================

class DayStreakItem(BaseModel):
    data: str
    dia_semana: str
    respondidas: int
    bateu_meta: bool


class UserStreakResponse(BaseModel):
    dias_consecutivos: int
    respondidas_hoje: int
    meta_diaria: int
    historico_semana: list[DayStreakItem]
    maior_streak: int


# =============================================
# FLASHCARDS INTELIGENTES (SM-2)
# =============================================

class FlashcardItem(BaseModel):
    id: str
    questao_id: UUID
    frente: str
    verso: str
    disciplina: str
    assunto: str
    nivel_dificuldade: str = "Médio"
    repetition_count: int = 0
    interval_days: int = 1
    ease_factor: float = 2.5
    origem: str = "Caderno de Erros"


class FlashcardReviewRequest(BaseModel):
    card_id: str = Field(..., max_length=100)
    rating: int = Field(..., ge=0, le=5)  # 0: Errei, 2: Difícil, 4: Bom, 5: Fácil


class FlashcardsResponse(BaseModel):
    total: int
    pendentes: int
    items: list[FlashcardItem]


# =============================================
# RAIO-X DA BANCA E DO EDITAL
# =============================================

class RaioXTopicoItem(BaseModel):
    assunto: str
    total_questoes: int
    percentual: float
    relevancia: str


class RaioXDisciplinaItem(BaseModel):
    disciplina: str
    total_questoes: int
    percentual: float
    topicos: list[RaioXTopicoItem]


class RaioXResponse(BaseModel):
    titulo: str
    banca_nome: str | None = None
    concurso_nome: str | None = None
    total_questoes_analisadas: int
    disciplinas: list[RaioXDisciplinaItem]


# =============================================
# EDITAL VERTICALIZADO INTERATIVO
# =============================================

class EditalTopicoItem(BaseModel):
    id: str
    nome: str
    questoes_disponiveis: int
    teoria_lida: bool = False
    questoes_feitas: int = 0
    revisado: bool = False


class EditalDisciplinaItem(BaseModel):
    id: str
    nome: str
    progresso_pct: float = 0.0
    topicos: list[EditalTopicoItem]


class EditalVerticalizadoResponse(BaseModel):
    concurso_id: UUID | None = None
    titulo: str
    orgao: str
    cargo: str
    total_topicos: int
    disciplinas: list[EditalDisciplinaItem]


# =============================================
# IMPORTAÇÃO DE EDITAIS E ALIMENTAÇÃO DA BASE
# =============================================

class EditalImportRequest(BaseModel):
    banca_nome: str = Field(..., min_length=2, max_length=100)
    orgao: str = Field(..., min_length=2, max_length=150)
    cargo: str = Field(..., min_length=2, max_length=150)
    ano: int = Field(2026, ge=1990, le=2030)
    nivel: str = Field("Superior", max_length=50)
    conteudo_programatico_texto: str = Field(..., min_length=20, max_length=50000)
    gerar_ineditas_quantidade: int = Field(2, ge=0, le=10)


class EditalTopicoImportado(BaseModel):
    disciplina: str
    topicos: list[str]
    questoes_passadas_encontradas: int = 0
    questoes_ineditas_geradas: int = 0


class EditalImportResponse(BaseModel):
    concurso_id: UUID
    titulo: str
    total_disciplinas: int
    total_topicos: int
    total_questoes_vinculadas: int
    total_questoes_geradas: int
    disciplinas: list[EditalTopicoImportado]


# =============================================
# ESTATÍSTICAS POR ALTERNATIVA & ÍNDICE DE PEGADINHA
# =============================================

class AlternativaEstatistica(BaseModel):
    letra: str
    percentual: float
    is_correta: bool = False
    is_pegadinha: bool = False


class QuestaoEstatisticasResponse(BaseModel):
    questao_id: UUID
    total_respostas: int
    indice_acerto: float
    indice_pegadinha: float
    pegadinha_letra: str | None = None
    distribuicao: list[AlternativaEstatistica]
    dica_antidoto: str | None = None


# =============================================
# SEGURANÇA COGNITIVA & FIREWALL (Neural Cognitive Engine)
# =============================================

class PromptSecurityCheckRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=15000)


class PromptSecurityResponse(BaseModel):
    safe: bool
    reason: str
    log: str


# =============================================
# SIMULADOR DE RECURSOS ADMINISTRATIVOS DA BANCA
# =============================================

class RecursoRequest(BaseModel):
    alternativa_marcada: str = Field(..., max_length=10)
    argumentacao: str = Field(..., min_length=10, max_length=5000)
    tipo_pedido: str = Field("anulacao", description="'anulacao' ou 'alteracao_gabarito'")


class RecursoResponse(BaseModel):
    questao_id: UUID
    banca: str
    parecer: str  # "DEFERIDO", "INDEFERIDO", "ANULADO"
    gabarito_oficial_mantido_ou_novo: str
    fundamentacao_banca: str
    analise_pontual: str
    impacto_pontuacao: str


# =============================================
# RAIO-X JURISPRUDENCIAL & SÚMULAS
# =============================================

class JurisprudenciaItem(BaseModel):
    tribunal: str  # "STF", "STJ", "TST", "TCU"
    tipo: str  # "Súmula Vinculante", "Súmula", "Tema de Repercussão Geral", "Recurso Repetitivo", "Informativo"
    numero_identificador: str  # ex: "Súmula Vinculante 13", "Tema 1032/STJ"
    enunciado_resumo: str
    aplicacao_na_questao: str


class JurisprudenciaResponse(BaseModel):
    questao_id: UUID
    tema_central: str
    disciplina: str
    banca: str
    jurisprudencias: list[JurisprudenciaItem]
    posicionamento_banca: str


# =============================================
# LABORATÓRIO DE REDAÇÃO DISCURSIVA (Banca IA)
# =============================================

class RedacaoTema(BaseModel):
    id: str
    titulo: str
    carreira: str
    banca: str
    tipo: str
    texto_motivador: str
    criterios: list[str]


class RedacaoCorrigirRequest(BaseModel):
    tema: str = Field(..., min_length=5, max_length=500)
    texto_aluno: str = Field(..., min_length=30, max_length=15000)
    banca: str = "Cebraspe"
    tipo_redacao: str = "Dissertação Argumentativa"


class AspectosMacro(BaseModel):
    apresentacao: float
    estrutura: float
    conteudo: float


class ErroMicro(BaseModel):
    linha: int
    tipo: str
    descricao: str


class RedacaoCorrigirResponse(BaseModel):
    nota_final: float
    nota_maxima: float
    aspectos_macro: AspectosMacro
    erros_micro: list[ErroMicro]
    parecer_banca: str
    dicas_ouro: list[str]


# =============================================
# FOCO & APOIO PSICOLÓGICO PARA CONCURSOS
# =============================================

class PsicologoConsultaRequest(BaseModel):
    mensagem: str = Field(..., min_length=3, max_length=3000)
    nivel_ansiedade: int = Field(5, ge=1, le=10)
    contexto_estudo: str | None = None


class PsicologoConsultaResponse(BaseModel):
    resposta_terapeutica: str
    tecnica_sugerida: str
    passos_praticos: list[str]
    afirmacao_positiva: str


# =============================================
# CRONOGRAMAS SEMANAIS & TRILHAS DE ESTUDO
# =============================================

class CronogramaItem(BaseModel):
    dia_semana: str
    turno: str
    disciplina: str
    topico: str
    meta_questoes: int
    revisao_ativa: bool = True


class CronogramaSemanalResponse(BaseModel):
    ciclo_nome: str
    horas_semanais: int
    dias: list[CronogramaItem]
    orientacao_especialista: str


# =============================================
# RANKING EXCLUSIVO DE CONCORRENTES
# =============================================

class RankingUsuario(BaseModel):
    posicao: int
    nome: str
    avatar: str
    carreira: str
    questoes_feitas: int
    taxa_acerto: float
    pontos_liquidos: float
    is_usuario_atual: bool = False
    badge: str


class RankingResponse(BaseModel):
    posicao_usuario: int
    total_concorrentes: int
    percentil_usuario: float
    ranking: list[RankingUsuario]


# =============================================
# CENTRAL DE SKILLS IA (FERRAMENTAS TÁTICAS)
# =============================================

class SuperPesquisaRequest(BaseModel):
    tema: str = Field(..., min_length=3, max_length=1000)
    banca: str = Field("Cebraspe", max_length=50)
    carreira: str = Field("Geral", max_length=50)


class TabelaMnemonicaItem(BaseModel):
    conceito: str
    regra: str
    excecao: str


class SuperPesquisaResponse(BaseModel):
    tema: str
    banca: str
    sumulas_stf_stj: list[str]
    artigos_chave: list[str]
    divergencia_doutrinaria: str
    padrao_cobranca_banca: str
    armadilhas_frequentes: list[str]
    tabela_mnemonica: list[TabelaMnemonicaItem]


class DistratorAnaliseItem(BaseModel):
    opcao: str
    falacia_empregada: str


class QuestaoCloneItem(BaseModel):
    enunciado: str
    tipo_questao: str
    alternativas: list[dict]
    alternativa_correta: str
    explicacao: str


class EngenhariaReversaRequest(BaseModel):
    enunciado: str = Field(..., min_length=10, max_length=5000)
    banca: str = Field("Cebraspe", max_length=50)
    gabarito_oficial: str | None = None
    alternativas: list[str] | None = None


class EngenhariaReversaResponse(BaseModel):
    banca: str
    nivel_bloom: str
    fonte_primaria: str
    dna_pegadinha: str
    formula_examinador: str
    analise_distratores: list[DistratorAnaliseItem]
    questoes_clones: list[QuestaoCloneItem]


class DebateMultiagenteRequest(BaseModel):
    tema_ou_questao: str = Field(..., min_length=5, max_length=3000)
    banca: str = Field("Cebraspe", max_length=50)


class DebateMultiagenteResponse(BaseModel):
    tema: str
    banca: str
    agente_lei_seca: str
    agente_tribunais: str
    agente_doutrina: str
    replica_debate: str
    veredito_relator: str
    gabarito_recomendado: str
    dica_antidoto: str


class TokenReducerRequest(BaseModel):
    texto_bruto: str = Field(..., min_length=10, max_length=15000)
    nivel_compressao: str = Field("alto", max_length=20)


class RegraPrazoItem(BaseModel):
    item: str
    detalhe: str


class TokenReducerResponse(BaseModel):
    tokens_originais_est: int
    tokens_comprimidos_est: int
    taxa_reducao_percent: float
    resumo_ultra_denso: str
    mnemonicos: list[str]
    regras_e_prazos_chave: list[RegraPrazoItem]
    mapa_mental_bullets: list[str]


class AuditorPegadinhaRequest(BaseModel):
    texto_questao: str = Field(..., min_length=10, max_length=4000)
    banca: str = Field("Cebraspe", max_length=50)


class AuditorPegadinhaResponse(BaseModel):
    banca: str
    indice_periculosidade: int
    classificacao_risco: str
    termos_suspeitos_detectados: list[str]
    armadilhas_identificadas: list[str]
    vulnerabilidade_recurso: str
    antidoto_candidato: str


class SkillPresetItem(BaseModel):
    id: str
    skill_id: str
    titulo: str
    descricao: str
    banca: str
    payload_exemplo: dict


class SkillsCatalogResponse(BaseModel):
    presets: list[SkillPresetItem]




