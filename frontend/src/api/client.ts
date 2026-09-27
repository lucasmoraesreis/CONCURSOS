/**
 * API Client — Wrapper para comunicação com o backend FastAPI
 */

import axios from 'axios';
import type {
  Banca,
  ConcursoListResponse,
  Disciplina,
  Assunto,
  QuestoesListResponse,
  BuscaSemanticaResponse,
  GerarIneditaRequest,
  QuestaoGeradaResponse,
  FiltrosOpcoes,
  QuestoesFilterParams,
  StudyDashboard,
  StudyAnswerRequest,
  StudyAnswerResponse,
  StudyStateResponse,
  StudyPlan,
  SmartSimulado,
  CoverageResponse,
  TutorChatRequest,
  TutorChatResponse,
  UserStreak,
  FlashcardsResponse,
  RaioXResponse,
  EditalVerticalizado,
  GamificationProfile,
  EditalImportRequest,
  EditalImportResponse,
  QuestaoEstatisticasResponse,
  RecursoRequest,
  RecursoResponse,
  JurisprudenciaResponse,
  PromptSecurityResponse,
  RedacaoTema,
  RedacaoCorrigirRequest,
  RedacaoCorrigirResponse,
  PsicologoConsultaRequest,
  PsicologoConsultaResponse,
  CronogramaSemanalResponse,
  RankingResponse,
  SkillsCatalogResponse,
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
} from '../types';


const rawBaseURL = (import.meta.env.VITE_API_URL || '').trim();
const baseURL = rawBaseURL
  ? (rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL.replace(/\/$/, '')}/api`)
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================
// DEDUPLICAÇÃO DE REQUISIÇÕES IN-FLIGHT (C10M)
// =============================================
const inFlightRequests = new Map<string, Promise<unknown>>();

export function deduplicatedGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(params || {})}`;
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const promise = api
    .get<T>(url, { params })
    .then((res) => {
      inFlightRequests.delete(cacheKey);
      return res.data;
    })
    .catch((err) => {
      inFlightRequests.delete(cacheKey);
      throw err;
    });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

// =============================================
// Bancas
// =============================================

export async function fetchBancas(): Promise<Banca[]> {
  return deduplicatedGet<Banca[]>('/bancas');
}

// =============================================
// Concursos
// =============================================

export async function fetchConcursos(params?: {
  banca_id?: string;
  ano?: number;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ConcursoListResponse> {
  const { data } = await api.get<ConcursoListResponse>('/concursos', { params });
  return data;
}

// =============================================
// Disciplinas (cascata a partir do concurso)
// =============================================

export async function fetchDisciplinas(concursoId: string): Promise<Disciplina[]> {
  const { data } = await api.get<Disciplina[]>(`/concursos/${concursoId}/disciplinas`);
  return data;
}

// =============================================
// Assuntos (cascata a partir da disciplina + concurso)
// =============================================

export async function fetchAssuntos(
  disciplinaId: string,
  concursoId: string
): Promise<Assunto[]> {
  const { data } = await api.get<Assunto[]>(`/disciplinas/${disciplinaId}/assuntos`, {
    params: { concurso_id: concursoId },
  });
  return data;
}

// =============================================
// Filtros Opções Dinâmicas
// =============================================

export async function fetchFiltrosOpcoes(params?: {
  nivel?: string;
  concurso_id?: string;
  disciplina_id?: string;
}): Promise<FiltrosOpcoes> {
  const { data } = await api.get<FiltrosOpcoes>('/questoes/filtros-opcoes', { params });
  return data;
}

// =============================================
// Questões (com filtros compostos)
// =============================================

export async function fetchQuestoes(params?: QuestoesFilterParams): Promise<QuestoesListResponse> {
  const { data } = await api.get<QuestoesListResponse>('/questoes', { params });
  return data;
}

// =============================================
// Busca Semântica (pgvector)
// =============================================

export async function fetchBuscaSemantica(params: {
  q: string;
  concurso_id?: string;
  disciplina_id?: string;
  limit?: number;
}): Promise<BuscaSemanticaResponse> {
  const { data } = await api.get<BuscaSemanticaResponse>('/questoes/busca-semantica', { params });
  return data;
}

// =============================================
// Gerador de Questões Inéditas (Hacker de Bancas)
// =============================================

export async function gerarQuestaoInedita(payload: GerarIneditaRequest): Promise<QuestaoGeradaResponse> {
  const { data } = await api.post<QuestaoGeradaResponse>('/questoes/gerar-inedita', payload);
  return data;
}

// =============================================
// Geração em Lote (batch paralelo)
// =============================================

import type { Questao } from '../types';

/**
 * Gera N questões inéditas em paralelo.
 * Retorna apenas as que foram geradas com sucesso.
 * O startIndex define o número base para numerar as questões.
 */
export async function gerarLoteIneditas(
  payload: GerarIneditaRequest,
  quantidade: number = 5,
  startIndex: number = 1
): Promise<Questao[]> {
  const promises = Array.from({ length: quantidade }, () =>
    gerarQuestaoInedita(payload)
  );

  const results = await Promise.allSettled(promises);

  const questoes: Questao[] = [];
  let idx = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const data = result.value;
      questoes.push({
        id: data.id || `inedita-${Date.now()}-${idx}`,
        numero_questao: startIndex + idx,
        tipo_questao: data.tipo_questao,
        enunciado: data.enunciado,
        alternativa_correta: data.alternativa_correta,
        justificativa_ia: data.justificativa_ia,
        alternativas: data.alternativas.map((alt, altIdx) => ({
          id: `alt-${startIndex + idx}-${altIdx}`,
          letra: alt.letra,
          texto: alt.texto,
          is_correta: alt.letra === data.alternativa_correta,
        })),
        disciplina_nome: data.disciplina,
        assunto_nome: data.assunto,
        concurso_orgao: 'Simulado Hacker de Bancas',
        concurso_cargo: 'Questão Inédita',
        concurso_ano: new Date().getFullYear(),
        banca_nome: data.banca_emulada,
        is_inedita: true,
        engenharia_da_pegadinha: data.engenharia_da_pegadinha,
      });
      idx++;
    }
  }

  return questoes;
}

// =============================================
// Estudo, desempenho e cobertura
// =============================================

export async function fetchStudyDashboard(): Promise<StudyDashboard> {
  const { data } = await api.get<StudyDashboard>('/study/dashboard');
  return data;
}

export async function answerQuestion(payload: StudyAnswerRequest): Promise<StudyAnswerResponse> {
  const { data } = await api.post<StudyAnswerResponse>('/study/answer', payload);
  return data;
}

export async function toggleQuestionFavorite(questaoId: string): Promise<StudyStateResponse> {
  const { data } = await api.post<StudyStateResponse>(`/study/questions/${questaoId}/favorite`);
  return data;
}

export async function saveQuestionNote(questaoId: string, note: string): Promise<StudyStateResponse> {
  const { data } = await api.post<StudyStateResponse>(`/study/questions/${questaoId}/note`, { note });
  return data;
}

export async function reportQuestion(questaoId: string, issue: string): Promise<StudyStateResponse> {
  const { data } = await api.post<StudyStateResponse>(`/study/questions/${questaoId}/report`, { issue });
  return data;
}

export async function fetchStudyErrors(limit = 30): Promise<SmartSimulado> {
  const { data } = await api.get<SmartSimulado>('/study/errors', { params: { limit } });
  return data;
}

export async function fetchStudyReviews(limit = 30): Promise<SmartSimulado> {
  const { data } = await api.get<SmartSimulado>('/study/reviews', { params: { limit } });
  return data;
}

export async function fetchStudyFavorites(limit = 30): Promise<SmartSimulado> {
  const { data } = await api.get<SmartSimulado>('/study/favorites', { params: { limit } });
  return data;
}

export async function fetchStudyPlan(params?: {
  concurso_id?: string;
  dias?: number;
}): Promise<StudyPlan> {
  const { data } = await api.get<StudyPlan>('/study/plan', { params });
  return data;
}

export async function fetchSmartSimulado(params?: {
  concurso_id?: string;
  disciplina_id?: string;
  modo?: 'geral' | 'erros' | 'revisao' | 'favoritas';
  quantidade?: number;
}): Promise<SmartSimulado> {
  const { data } = await api.get<SmartSimulado>('/study/simulado-inteligente', { params });
  return data;
}

export async function fetchCoverage(): Promise<CoverageResponse> {
  const { data } = await api.get<CoverageResponse>('/study/coverage');
  return data;
}

export async function askTutor(payload: TutorChatRequest): Promise<TutorChatResponse> {
  const { data } = await api.post<TutorChatResponse>('/study/tutor', payload);
  return data;
}

export async function fetchUserStreak(): Promise<UserStreak> {
  const { data } = await api.get<UserStreak>('/study/streak');
  return data;
}

export async function fetchFlashcards(limit = 20): Promise<FlashcardsResponse> {
  const { data } = await api.get<FlashcardsResponse>('/study/flashcards', { params: { limit } });
  return data;
}

export async function reviewFlashcard(card_id: string, rating: number): Promise<{ status: string; next_review_days: number }> {
  const { data } = await api.post('/study/flashcards/review', { card_id, rating });
  return data;
}

export async function fetchRaioX(params?: { banca_id?: string; concurso_id?: string }): Promise<RaioXResponse> {
  const { data } = await api.get<RaioXResponse>('/study/raio-x', { params });
  return data;
}

export async function fetchEditalVerticalizado(concurso_id?: string): Promise<EditalVerticalizado> {
  const { data } = await api.get<EditalVerticalizado>('/study/edital-verticalizado', {
    params: concurso_id ? { concurso_id } : undefined,
  });
  return data;
}

export async function fetchGamificationProfile(): Promise<GamificationProfile> {
  const { data } = await api.get<GamificationProfile>('/study/gamification');
  return data;
}

export async function importEdital(payload: EditalImportRequest): Promise<EditalImportResponse> {
  const { data } = await api.post<EditalImportResponse>('/study/edital/import', payload);
  return data;
}

export async function fetchQuestaoEstatisticas(questaoId: string): Promise<QuestaoEstatisticasResponse> {
  const { data } = await api.get<QuestaoEstatisticasResponse>(`/questoes/${questaoId}/estatisticas`);
  return data;
}

export async function submeterRecurso(questaoId: string, payload: RecursoRequest): Promise<RecursoResponse> {
  const { data } = await api.post<RecursoResponse>(`/questoes/${questaoId}/recurso`, payload);
  return data;
}

export async function fetchJurisprudencia(questaoId: string): Promise<JurisprudenciaResponse> {
  const { data } = await api.get<JurisprudenciaResponse>(`/questoes/${questaoId}/jurisprudencia`);
  return data;
}

export async function checkPromptSecurity(prompt: string): Promise<PromptSecurityResponse> {
  const { data } = await api.post<PromptSecurityResponse>('/questoes/prompt-check', { prompt });
  return data;
}

export async function fetchRedacaoTemas(): Promise<RedacaoTema[]> {
  const { data } = await api.get<RedacaoTema[]>('/redacao/temas');
  return data;
}

export async function corrigirRedacao(payload: RedacaoCorrigirRequest): Promise<RedacaoCorrigirResponse> {
  const { data } = await api.post<RedacaoCorrigirResponse>('/redacao/corrigir', payload);
  return data;
}

export async function consultarPsicologo(payload: PsicologoConsultaRequest): Promise<PsicologoConsultaResponse> {
  const { data } = await api.post<PsicologoConsultaResponse>('/mentoria/psicologo/consultar', payload);
  return data;
}

export async function fetchCronogramaSemanal(): Promise<CronogramaSemanalResponse> {
  const { data } = await api.get<CronogramaSemanalResponse>('/mentoria/cronograma');
  return data;
}

export async function fetchRankingConcorrentes(): Promise<RankingResponse> {
  const { data } = await api.get<RankingResponse>('/mentoria/ranking');
  return data;
}

// =============================================
// CENTRAL DE SKILLS IA (FERRAMENTAS TÁTICAS)
// =============================================

export async function fetchSkillsPresets(): Promise<SkillsCatalogResponse> {
  return deduplicatedGet<SkillsCatalogResponse>('/skills/presets');
}

export async function executarSuperPesquisa(payload: SuperPesquisaRequest): Promise<SuperPesquisaResponse> {
  const { data } = await api.post<SuperPesquisaResponse>('/skills/super-pesquisa', payload);
  return data;
}

export async function executarEngenhariaReversa(payload: EngenhariaReversaRequest): Promise<EngenhariaReversaResponse> {
  const { data } = await api.post<EngenhariaReversaResponse>('/skills/engenharia-reversa', payload);
  return data;
}

export async function executarDebateMultiagente(payload: DebateMultiagenteRequest): Promise<DebateMultiagenteResponse> {
  const { data } = await api.post<DebateMultiagenteResponse>('/skills/debate-multiagente', payload);
  return data;
}

export async function executarTokenReducer(payload: TokenReducerRequest): Promise<TokenReducerResponse> {
  const { data } = await api.post<TokenReducerResponse>('/skills/token-reducer', payload);
  return data;
}

export async function executarAuditorPegadinha(payload: AuditorPegadinhaRequest): Promise<AuditorPegadinhaResponse> {
  const { data } = await api.post<AuditorPegadinhaResponse>('/skills/auditor-pegadinha', payload);
  return data;
}

export default api;


