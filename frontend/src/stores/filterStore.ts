/**
 * Zustand Store — Estado global dos filtros
 *
 * Gerencia o estado completo dos filtros avançados:
 * - Linha 1: Palavra Chave, Disciplina, Assunto, Banca, Instituição, Ano
 * - Linha 2: Cargo, Nível, Área de Formação, Área de Atuação, Modalidade, Dificuldade
 * - Checkboxes: Excluir questões & Questões com
 * - Abas: Questões Objetivas vs Exercícios de Fixação
 * - Tags ativas com remoção individual
 * - Salvar / Carregar filtros no localStorage
 */

import { create } from 'zustand';
import type { ConcursoFiltroItem } from '../types';

export interface ExcluirFiltros {
  meusCadernos: boolean;
  meusSimulados: boolean;
  ineditas: boolean;
  anuladas: boolean;
  desatualizadas: boolean;
}

export interface ComFiltros {
  gabaritoComentado: boolean;
  comentarios: boolean;
  meusComentarios: boolean;
  aulas: boolean;
  minhasAnotacoes: boolean;
}

interface FilterStore {
  // Aba ativa
  modoAba: 'objetivas' | 'fixacao';

  // Concurso Mestre (Ditador de Filtros)
  concursoId: string | null;
  concursoSelecionado: ConcursoFiltroItem | null;

  // Linha 1
  search: string;
  disciplinaId: string | null;
  assuntoId: string | null;
  bancaId: string | null;
  instituicao: string | null;
  ano: number | null;

  // Linha 2
  cargo: string | null;
  nivel: string | null;
  areaFormacao: string | null;
  areaAtuacao: string | null;
  modalidade: string | null;
  dificuldade: string | null;

  // Checkboxes
  excluir: ExcluirFiltros;
  com: ComFiltros;

  // Controle de UI
  showMoreFilters: boolean;
  page: number;

  // Actions
  setModoAba: (modo: 'objetivas' | 'fixacao') => void;
  setSearch: (search: string) => void;
  setConcurso: (item: ConcursoFiltroItem | string | null) => void;
  setDisciplinaId: (id: string | null) => void;
  setAssuntoId: (id: string | null) => void;
  setBancaId: (id: string | null) => void;
  setInstituicao: (inst: string | null) => void;
  setAno: (ano: number | null) => void;
  setCargo: (cargo: string | null) => void;
  setNivel: (nivel: string | null) => void;
  setAreaFormacao: (area: string | null) => void;
  setAreaAtuacao: (area: string | null) => void;
  setModalidade: (modalidade: string | null) => void;
  setDificuldade: (dif: string | null) => void;
  setDisciplina: (id: string | null) => void;
  setAssunto: (id: string | null) => void;
  setBanca: (id: string | null) => void;
  toggleExcluir: (key: keyof ExcluirFiltros) => void;
  toggleCom: (key: keyof ComFiltros) => void;
  setShowMoreFilters: (show: boolean | ((prev: boolean) => boolean)) => void;
  setPage: (page: number) => void;
  removeFilter: (key: string) => void;
  salvarFiltros: () => boolean;
  carregarFiltrosSalvos: () => boolean;
  resetAll: () => void;
}

const initialExcluir: ExcluirFiltros = {
  meusCadernos: false,
  meusSimulados: false,
  ineditas: false,
  anuladas: false,
  desatualizadas: false,
};

const initialCom: ComFiltros = {
  gabaritoComentado: false,
  comentarios: false,
  meusComentarios: false,
  aulas: false,
  minhasAnotacoes: false,
};

const STORAGE_KEY = 'concursos_saved_filters_preset';

export const useFilterStore = create<FilterStore>((set, get) => ({
  modoAba: 'objetivas',
  search: '',
  disciplinaId: null,
  assuntoId: null,
  bancaId: null,
  instituicao: null,
  ano: null,
  cargo: null,
  nivel: null,
  areaFormacao: null,
  areaAtuacao: null,
  modalidade: null,
  dificuldade: null,
  excluir: { ...initialExcluir },
  com: { ...initialCom },
  showMoreFilters: true,
  page: 1,
  concursoId: null,
  concursoSelecionado: null,

  setModoAba: (modo) => set({ modoAba: modo, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),

  setConcurso: (item) => {
    if (!item) {
      set({
        concursoId: null,
        concursoSelecionado: null,
        bancaId: null,
        instituicao: null,
        ano: null,
        cargo: null,
        nivel: null,
        disciplinaId: null,
        assuntoId: null,
        page: 1,
      });
      return;
    }

    if (typeof item === 'string') {
      set({
        concursoId: item,
        disciplinaId: null,
        assuntoId: null,
        page: 1,
      });
      return;
    }

    // Objeto ConcursoFiltroItem recebido: dita os outros campos
    set({
      concursoId: item.id,
      concursoSelecionado: item,
      bancaId: item.banca_id,
      instituicao: item.orgao,
      ano: item.ano,
      cargo: item.cargo,
      nivel: item.nivel,
      disciplinaId: null,
      assuntoId: null,
      page: 1,
    });
  },

  setDisciplinaId: (id) =>
    set({
      disciplinaId: id,
      assuntoId: null, // Reseta assunto ao trocar disciplina
      page: 1,
    }),
  setDisciplina: (id) =>
    set({
      disciplinaId: id,
      assuntoId: null,
      page: 1,
    }),

  setAssuntoId: (id) => set({ assuntoId: id, page: 1 }),
  setAssunto: (id) => set({ assuntoId: id, page: 1 }),

  setBancaId: (id) => set({ bancaId: id, page: 1 }),
  setBanca: (id) => set({ bancaId: id, page: 1 }),

  setInstituicao: (inst) => set({ instituicao: inst, page: 1 }),
  setAno: (ano) => set({ ano, page: 1 }),
  setCargo: (cargo) => set({ cargo, page: 1 }),
  setNivel: (nivel) => set({ nivel, page: 1 }),
  setAreaFormacao: (area) => set({ areaFormacao: area, page: 1 }),
  setAreaAtuacao: (area) => set({ areaAtuacao: area, page: 1 }),
  setModalidade: (modalidade) => set({ modalidade, page: 1 }),
  setDificuldade: (dif) => set({ dificuldade: dif, page: 1 }),

  toggleExcluir: (key) =>
    set((state) => ({
      excluir: { ...state.excluir, [key]: !state.excluir[key] },
      page: 1,
    })),

  toggleCom: (key) =>
    set((state) => ({
      com: { ...state.com, [key]: !state.com[key] },
      page: 1,
    })),

  setShowMoreFilters: (show) =>
    set((state) => ({
      showMoreFilters: typeof show === 'function' ? show(state.showMoreFilters) : show,
    })),

  setPage: (page) => set({ page }),

  removeFilter: (key) => {
    const s = get();
    if (key === 'concursoId') {
      s.setConcurso(null);
    } else if (key === 'search') {
      set({ search: '', page: 1 });
    } else if (key === 'disciplinaId') {
      set({ disciplinaId: null, assuntoId: null, page: 1 });
    } else if (key === 'assuntoId') {
      set({ assuntoId: null, page: 1 });
    } else if (key === 'bancaId') {
      set({ bancaId: null, page: 1 });
    } else if (key === 'instituicao') {
      set({ instituicao: null, page: 1 });
    } else if (key === 'ano') {
      set({ ano: null, page: 1 });
    } else if (key === 'cargo') {
      set({ cargo: null, page: 1 });
    } else if (key === 'nivel') {
      set({ nivel: null, page: 1 });
    } else if (key === 'areaFormacao') {
      set({ areaFormacao: null, page: 1 });
    } else if (key === 'areaAtuacao') {
      set({ areaAtuacao: null, page: 1 });
    } else if (key === 'modalidade') {
      set({ modalidade: null, page: 1 });
    } else if (key === 'dificuldade') {
      set({ dificuldade: null, page: 1 });
    } else if (key in s.excluir) {
      set({
        excluir: { ...s.excluir, [key]: false },
        page: 1,
      });
    } else if (key in s.com) {
      set({
        com: { ...s.com, [key]: false },
        page: 1,
      });
    }
  },

  salvarFiltros: () => {
    try {
      const s = get();
      const payload = {
        concursoId: s.concursoId,
        concursoSelecionado: s.concursoSelecionado,
        search: s.search,
        disciplinaId: s.disciplinaId,
        assuntoId: s.assuntoId,
        bancaId: s.bancaId,
        instituicao: s.instituicao,
        ano: s.ano,
        cargo: s.cargo,
        nivel: s.nivel,
        areaFormacao: s.areaFormacao,
        areaAtuacao: s.areaAtuacao,
        modalidade: s.modalidade,
        dificuldade: s.dificuldade,
        excluir: s.excluir,
        com: s.com,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  },

  carregarFiltrosSalvos: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      set({
        ...parsed,
        page: 1,
      });
      return true;
    } catch {
      return false;
    }
  },

  resetAll: () =>
    set({
      search: '',
      concursoId: null,
      concursoSelecionado: null,
      disciplinaId: null,
      assuntoId: null,
      bancaId: null,
      instituicao: null,
      ano: null,
      cargo: null,
      nivel: null,
      areaFormacao: null,
      areaAtuacao: null,
      modalidade: null,
      dificuldade: null,
      excluir: { ...initialExcluir },
      com: { ...initialCom },
      page: 1,
    }),
}));

