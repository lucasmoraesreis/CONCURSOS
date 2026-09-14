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
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================
// Bancas
// =============================================

export async function fetchBancas(): Promise<Banca[]> {
  const { data } = await api.get<Banca[]>('/bancas');
  return data;
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
// Questões (com filtros compostos)
// =============================================

export async function fetchQuestoes(params?: {
  concurso_id?: string;
  disciplina_id?: string;
  assunto_id?: string;
  banca_id?: string;
  tipo_questao?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<QuestoesListResponse> {
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

export default api;
