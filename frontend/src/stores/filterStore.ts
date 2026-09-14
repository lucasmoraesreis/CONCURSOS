/**
 * Zustand Store — Estado global dos filtros
 *
 * Gerencia o estado dos filtros cascata e garante que
 * ao mudar um filtro pai, os filtros filhos são resetados.
 */

import { create } from 'zustand';

interface FilterStore {
  // Seleções
  concursoId: string | null;
  disciplinaId: string | null;
  assuntoId: string | null;
  bancaId: string | null;
  search: string;
  page: number;

  // Actions
  setConcurso: (id: string | null) => void;
  setDisciplina: (id: string | null) => void;
  setAssunto: (id: string | null) => void;
  setBanca: (id: string | null) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  resetAll: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  concursoId: null,
  disciplinaId: null,
  assuntoId: null,
  bancaId: null,
  search: '',
  page: 1,

  // Ao mudar concurso → reseta disciplina, assunto e página
  setConcurso: (id) =>
    set({
      concursoId: id,
      disciplinaId: null,
      assuntoId: null,
      page: 1,
    }),

  // Ao mudar disciplina → reseta assunto e página
  setDisciplina: (id) =>
    set({
      disciplinaId: id,
      assuntoId: null,
      page: 1,
    }),

  setAssunto: (id) => set({ assuntoId: id, page: 1 }),
  setBanca: (id) => set({ bancaId: id, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),

  resetAll: () =>
    set({
      concursoId: null,
      disciplinaId: null,
      assuntoId: null,
      bancaId: null,
      search: '',
      page: 1,
    }),
}));
