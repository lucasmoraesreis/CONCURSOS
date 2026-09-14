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
}

export interface QuestoesListResponse {
  total: number;
  page: number;
  limit: number;
  items: Questao[];
}

// Semantic Search Response
export interface BuscaSemanticaResponse {
  total: number;
  query: string;
  items: Questao[];
}

// Hacker de Bancas - Inéditas
export interface GerarIneditaRequest {
  banca: string;
  disciplina: string;
  assunto: string;
  tipo_questao?: string;
  dificuldade?: string;
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
