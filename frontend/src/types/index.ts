/* =============================================
   TypeScript Types for the Platform
   ============================================= */

export interface Banca {
  id: string;
  nome: string;
  slug: string;
}

export interface Concurso {
  id: string;
  orgao: string;
  cargo: string;
  ano: number;
  nivel: string;
  banca_nome: string;
  label: string;
}

export interface ConcursoListResponse {
  total: number;
  items: Concurso[];
}

export interface Disciplina {
  id: string;
  nome: string;
  slug: string;
  total_questoes: number;
}

export interface Assunto {
  id: string;
  nome: string;
  slug: string;
  total_questoes: number;
}

export interface Alternativa {
  id: string;
  letra: string;
  texto: string;
  is_correta: boolean;
}

export interface Questao {
  id: string;
  numero_questao: number;
  tipo_questao: string;
  enunciado: string;
  alternativa_correta: string | null;
  justificativa_ia: string | null;
  alternativas: Alternativa[];
  disciplina_nome: string | null;
  assunto_nome: string | null;
  concurso_orgao: string | null;
  concurso_cargo: string | null;
  concurso_ano: number | null;
  banca_nome: string | null;
  is_inedita?: boolean;
  engenharia_da_pegadinha?: string | null;
  similarity?: number | null;
  dificuldade?: string | null;
  nivel?: string | null;
  area_atuacao?: string | null;
  fonte?: string | null;
  is_favorita?: boolean;
  respondida_vezes?: number;
  acertos?: number;
  erros?: number;
  proxima_revisao?: string | null;
  anotacao?: string | null;
}

export interface QuestoesListResponse {
  total: number;
  page: number;
  limit: number;
  items: Questao[];
}

// Opções dinâmicas dos Filtros Avançados
export interface FiltroItem {
  id: string;
  nome: string;
}

export interface AssuntoFiltroItem {
  id: string;
  nome: string;
  disciplina_id: string;
}

export interface ConcursoFiltroItem {
  id: string;
  nome: string;
  orgao: string;
  cargo: string;
  ano: number;
  nivel: string;
  banca_id: string;
  banca_nome: string;
  total_questoes?: number;
}

export interface FiltrosOpcoes {
  concursos?: ConcursoFiltroItem[];
  disciplinas: FiltroItem[];
  assuntos: AssuntoFiltroItem[];
  bancas: FiltroItem[];
  instituicoes: string[];
  anos: number[];
  cargos: string[];
  niveis: string[];
  areas_formacao: string[];
  areas_atuacao: string[];
  modalidades: string[];
  dificuldades: string[];
}

export interface QuestoesFilterParams {
  concurso_id?: string;
  disciplina_id?: string;
  assunto_id?: string;
  banca_id?: string;
  tipo_questao?: string;
  search?: string;
  instituicao?: string;
  ano?: number;
  cargo?: string;
  nivel?: string;
  area_formacao?: string;
  area_atuacao?: string;
  dificuldade?: string;
  excluir_ineditas?: boolean;
  excluir_anuladas?: boolean;
  excluir_desatualizadas?: boolean;
  com_gabarito_comentado?: boolean;
  com_comentarios?: boolean;
  com_aulas?: boolean;
  modo?: string;
  page?: number;
  limit?: number;
}

// Semantic Search Response
export interface BuscaSemanticaResponse {
  total: number;
  query: string;
  items: Questao[];
}

export interface GerarIneditaRequest {
  banca: string;
  disciplina: string;
  assunto: string;
  tipo_questao?: string;
  dificuldade?: string;
  provider?: string;
}

export interface QuestaoGeradaResponse {
  id?: string;
  tipo_questao: string;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  alternativa_correta: string;
  engenharia_da_pegadinha: string;
  justificativa_ia: string;
  banca_emulada: string;
  disciplina: string;
  assunto: string;
  is_inedita: boolean;
  provider_used?: string;
}

// Filter state
export interface FilterState {
  concursoId: string | null;
  disciplinaId: string | null;
  assuntoId: string | null;
  bancaId: string | null;
  search: string;
  page: number;
}

export interface StudyKpi {
  label: string;
  value: number | string;
  detail?: string | null;
}

export interface PerformanceSlice {
  nome: string;
  total: number;
  acertos: number;
  erros: number;
  taxa_acerto: number;
}

export interface StudyDashboard {
  kpis: StudyKpi[];
  desempenho_por_disciplina: PerformanceSlice[];
  desempenho_por_banca: PerformanceSlice[];
  erros_recentes: Questao[];
  revisoes_pendentes: Questao[];
}

export interface StudyAnswerRequest {
  questao_id: string;
  alternativa: string;
  tempo_segundos?: number;
}

export interface StudyAnswerResponse {
  correta: boolean;
  alternativa_correta: string | null;
  next_review_at: string | null;
  review_stage: number;
  answered_count: number;
  correct_count: number;
  wrong_count: number;
  tipo_erro?: string | null;
  diagnostico_erro?: string | null;
  mapa_mental_mermaid?: string | null;
}

export interface BadgeItem {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  categoria: string;
  unlocked: boolean;
  progresso_pct: number;
  data_desbloqueio?: string | null;
}

export interface LeagueStatus {
  nome: string;
  nivel: number;
  xp_atual: number;
  xp_proximo_nivel: number;
  icone: string;
  cor: string;
  posicao_ranking: number;
}

export interface GamificationProfile {
  xp_total: number;
  liga: LeagueStatus;
  badges: BadgeItem[];
  conquistas_total: number;
  conquistas_desbloqueadas: number;
}

export interface StudyStateResponse {
  questao_id: string;
  is_favorite: boolean;
  note?: string | null;
  reported_issue?: string | null;
}

export interface StudyPlanItem {
  disciplina_id?: string | null;
  disciplina: string;
  questoes: number;
  meta_diaria: number;
  revisoes_semanais: number;
  prioridade: string;
}

export interface StudyPlan {
  concurso_id?: string | null;
  titulo: string;
  total_questoes: number;
  dias_estimados: number;
  questoes_por_dia: number;
  itens: StudyPlanItem[];
}

export interface SmartSimulado {
  titulo: string;
  total: number;
  items: Questao[];
}

export interface CoverageGroup {
  nome: string;
  concursos: number;
  concursos_com_questoes: number;
  questoes: number;
  cobertura_pct: number;
}

export interface CoverageResponse {
  concursos_total: number;
  concursos_com_questoes: number;
  concursos_sem_questoes: number;
  provas_sem_questoes: number;
  questoes_total: number;
  alternativas_total: number;
  questoes_sem_alternativas: number;
  fontes: StudyKpi[];
  por_banca: CoverageGroup[];
  por_nivel: CoverageGroup[];
}

// =============================================
// TUTOR IA SOCRÁTICO
// =============================================

export interface TutorChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TutorChatRequest {
  questao_id: string;
  pergunta: string;
  historico?: TutorChatMessage[];
  modo?: 'socratico' | 'direto';
}

export interface TutorChatResponse {
  resposta: string;
  dica?: string | null;
  citacao_lei?: string | null;
  artigos_relevantes: string[];
}

// =============================================
// OFENSIVA DIÁRIA (STREAKS) E METAS
// =============================================

export interface DayStreakItem {
  data: string;
  dia_semana: string;
  respondidas: number;
  bateu_meta: boolean;
}

export interface UserStreak {
  dias_consecutivos: number;
  respondidas_hoje: number;
  meta_diaria: number;
  historico_semana: DayStreakItem[];
  maior_streak: number;
}

// =============================================
// FLASHCARDS INTELIGENTES (SM-2)
// =============================================

export interface Flashcard {
  id: string;
  questao_id: string;
  frente: string;
  verso: string;
  disciplina: string;
  assunto: string;
  nivel_dificuldade: string;
  repetition_count: number;
  interval_days: number;
  ease_factor: number;
  origem: string;
}

export interface FlashcardsResponse {
  total: number;
  pendentes: number;
  items: Flashcard[];
}

// =============================================
// RAIO-X DA BANCA E DO EDITAL
// =============================================

export interface RaioXTopico {
  assunto: string;
  total_questoes: number;
  percentual: number;
  relevancia: string;
}

export interface RaioXDisciplina {
  disciplina: string;
  total_questoes: number;
  percentual: number;
  topicos: RaioXTopico[];
}

export interface RaioXResponse {
  titulo: string;
  banca_nome?: string | null;
  concurso_nome?: string | null;
  total_questoes_analisadas: number;
  disciplinas: RaioXDisciplina[];
}

// =============================================
// EDITAL VERTICALIZADO INTERATIVO
// =============================================

export interface EditalTopico {
  id: string;
  nome: string;
  questoes_disponiveis: number;
  teoria_lida: boolean;
  questoes_feitas: number;
  revisado: boolean;
}

export interface EditalDisciplina {
  id: string;
  nome: string;
  progresso_pct: number;
  topicos: EditalTopico[];
}

export interface EditalVerticalizado {
  concurso_id?: string | null;
  titulo: string;
  orgao: string;
  cargo: string;
  total_topicos: number;
  disciplinas: EditalDisciplina[];
}

// =============================================
// IMPORTAÇÃO DE EDITAIS E ALIMENTAÇÃO DA BASE
// =============================================

export interface EditalImportRequest {
  banca_nome: string;
  orgao: string;
  cargo: string;
  ano: number;
  nivel: string;
  conteudo_programatico_texto: string;
  gerar_ineditas_quantidade: number;
}

export interface EditalTopicoImportado {
  disciplina: string;
  topicos: string[];
  questoes_passadas_encontradas: number;
  questoes_ineditas_geradas: number;
}

export interface EditalImportResponse {
  concurso_id: string;
  titulo: string;
  total_disciplinas: number;
  total_topicos: number;
  total_questoes_vinculadas: number;
  total_questoes_geradas: number;
  disciplinas: EditalTopicoImportado[];
}

// =============================================
// ESTATÍSTICAS POR ALTERNATIVA & ÍNDICE DE PEGADINHA
// =============================================

export interface AlternativaEstatistica {
  letra: string;
  percentual: number;
  is_correta: boolean;
  is_pegadinha: boolean;
}

export interface QuestaoEstatisticasResponse {
  questao_id: string;
  total_respostas: number;
  indice_acerto: number;
  indice_pegadinha: number;
  pegadinha_letra?: string | null;
  distribuicao: AlternativaEstatistica[];
  dica_antidoto?: string | null;
}

// =============================================
// RECURSOS DA BANCA & RAIO-X JURISPRUDENCIAL
// =============================================

export interface RecursoRequest {
  alternativa_marcada: string;
  argumentacao: string;
  tipo_pedido: 'anulacao' | 'alteracao_gabarito';
}

export interface RecursoResponse {
  questao_id: string;
  banca: string;
  parecer: 'DEFERIDO' | 'INDEFERIDO' | 'ANULADO';
  gabarito_oficial_mantido_ou_novo: string;
  fundamentacao_banca: string;
  analise_pontual: string;
  impacto_pontuacao: string;
}

export interface JurisprudenciaItem {
  tribunal: string;
  tipo: string;
  numero_identificador: string;
  enunciado_resumo: string;
  aplicacao_na_questao: string;
}

export interface JurisprudenciaResponse {
  questao_id: string;
  tema_central: string;
  disciplina: string;
  banca: string;
  jurisprudencias: JurisprudenciaItem[];
  posicionamento_banca: string;
}

export interface PromptSecurityResponse {
  safe: boolean;
  reason: string;
  log: string;
}

// =============================================
// LABORATÓRIO DE REDAÇÃO DISCURSIVA (Banca IA)
// =============================================

export interface RedacaoTema {
  id: string;
  titulo: string;
  carreira: string;
  banca: string;
  tipo: string;
  texto_motivador: string;
  criterios: string[];
}

export interface RedacaoCorrigirRequest {
  tema: string;
  texto_aluno: string;
  banca: string;
  tipo_redacao: string;
}

export interface AspectosMacro {
  apresentacao: number;
  estrutura: number;
  conteudo: number;
}

export interface ErroMicro {
  linha: number;
  tipo: string;
  descricao: string;
}

export interface RedacaoCorrigirResponse {
  nota_final: number;
  nota_maxima: number;
  aspectos_macro: AspectosMacro;
  erros_micro: ErroMicro[];
  parecer_banca: string;
  dicas_ouro: string[];
}

// =============================================
// PSICÓLOGO & FOCO CONCURSEIRO
// =============================================

export interface PsicologoConsultaRequest {
  mensagem: string;
  nivel_ansiedade: number;
  contexto_estudo?: string;
}

export interface PsicologoConsultaResponse {
  resposta_terapeutica: string;
  tecnica_sugerida: string;
  passos_praticos: string[];
  afirmacao_positiva: string;
}

// =============================================
// CRONOGRAMA & TRILHAS SEMANAIS
// =============================================

export interface CronogramaItem {
  dia_semana: string;
  turno: string;
  disciplina: string;
  topico: string;
  meta_questoes: number;
  revisao_ativa: boolean;
}

export interface CronogramaSemanalResponse {
  ciclo_nome: string;
  horas_semanais: number;
  dias: CronogramaItem[];
  orientacao_especialista: string;
}

// =============================================
// RANKING DE CONCORRENTES
// =============================================

export interface RankingUsuario {
  posicao: number;
  nome: string;
  avatar: string;
  carreira: string;
  questoes_feitas: number;
  taxa_acerto: number;
  pontos_liquidos: number;
  is_usuario_atual?: boolean;
  badge: string;
}

export interface RankingResponse {
  posicao_usuario: number;
  total_concorrentes: number;
  percentil_usuario: number;
  ranking: RankingUsuario[];
}

// =============================================
// CENTRAL DE SKILLS IA (FERRAMENTAS TÁTICAS)
// =============================================

export interface TabelaMnemonicaItem {
  conceito: string;
  regra: string;
  excecao: string;
}

export interface SuperPesquisaRequest {
  tema: string;
  banca?: string;
  carreira?: string;
}

export interface SuperPesquisaResponse {
  tema: string;
  banca: string;
  sumulas_stf_stj: string[];
  artigos_chave: string[];
  divergencia_doutrinaria: string;
  padrao_cobranca_banca: string;
  armadilhas_frequentes: string[];
  tabela_mnemonica: TabelaMnemonicaItem[];
}

export interface DistratorAnaliseItem {
  opcao: string;
  falacia_empregada: string;
}

export interface QuestaoCloneItem {
  enunciado: string;
  tipo_questao: string;
  alternativas: { letra: string; texto: string }[];
  alternativa_correta: string;
  explicacao: string;
}

export interface EngenhariaReversaRequest {
  enunciado: string;
  banca?: string;
  gabarito_oficial?: string;
  alternativas?: string[];
}

export interface EngenhariaReversaResponse {
  banca: string;
  nivel_bloom: string;
  fonte_primaria: string;
  dna_pegadinha: string;
  formula_examinador: string;
  analise_distratores: DistratorAnaliseItem[];
  questoes_clones: QuestaoCloneItem[];
}

export interface DebateMultiagenteRequest {
  tema_ou_questao: string;
  banca?: string;
}

export interface DebateMultiagenteResponse {
  tema: string;
  banca: string;
  agente_lei_seca: string;
  agente_tribunais: string;
  agente_doutrina: string;
  replica_debate: string;
  veredito_relator: string;
  gabarito_recomendado: string;
  dica_antidoto: string;
}

export interface RegraPrazoItem {
  item: string;
  detalhe: string;
}

export interface TokenReducerRequest {
  texto_bruto: string;
  nivel_compressao?: 'moderado' | 'alto' | 'extremo';
}

export interface TokenReducerResponse {
  tokens_originais_est: number;
  tokens_comprimidos_est: number;
  taxa_reducao_percent: number;
  resumo_ultra_denso: string;
  mnemonicos: string[];
  regras_e_prazos_chave: RegraPrazoItem[];
  mapa_mental_bullets: string[];
}

export interface AuditorPegadinhaRequest {
  texto_questao: string;
  banca?: string;
}

export interface AuditorPegadinhaResponse {
  banca: string;
  indice_periculosidade: number;
  classificacao_risco: string;
  termos_suspeitos_detectados: string[];
  armadilhas_identificadas: string[];
  vulnerabilidade_recurso: string;
  antidoto_candidato: string;
}

export interface SkillPresetItem {
  id: string;
  skill_id: string;
  titulo: string;
  descricao: string;
  banca: string;
  payload_exemplo: Record<string, unknown>;
}

export interface SkillsCatalogResponse {
  presets: SkillPresetItem[];
}




