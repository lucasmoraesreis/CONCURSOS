/**
 * generatorStore — Estado global do Gerador de Questões Inéditas
 *
 * Controla:
 * - Navegação entre a página principal e a página de questões geradas
 * - Configurações selecionadas no modal (banca, disciplina, etc.)
 * - Array acumulado de questões geradas (scroll infinito)
 * - Estados de loading e erro
 */

import { create } from 'zustand';
import type { Questao } from '../types';

export interface GeneratorConfig {
  banca: string;
  disciplina: string;
  assunto: string;
  tipoQuestao: string;
  dificuldade: string;
  provider: string;
}

interface GeneratorStore {
  // Routing
  currentView: 'main' | 'generator';

  // Config selecionada no modal
  config: GeneratorConfig;

  // Questões acumuladas
  questoes: Questao[];

  // Loading state
  isGenerating: boolean;
  generationStep: string;
  error: string | null;

  // Contadores
  totalGenerated: number;

  // Actions
  setConfig: (config: GeneratorConfig) => void;
  navigateToGenerator: (config: GeneratorConfig) => void;
  goBack: () => void;
  setIsGenerating: (val: boolean) => void;
  setGenerationStep: (step: string) => void;
  setError: (error: string | null) => void;
  addQuestoes: (novas: Questao[]) => void;
  reset: () => void;
}

const DEFAULT_CONFIG: GeneratorConfig = {
  banca: 'Cebraspe',
  disciplina: 'Direito Constitucional',
  assunto: 'Artigo 5º - Direitos e Garantias Fundamentais',
  tipoQuestao: 'Certo/Errado',
  dificuldade: 'Difícil',
  provider: 'auto',
};

export const useGeneratorStore = create<GeneratorStore>((set) => ({
  currentView: 'main',
  config: DEFAULT_CONFIG,
  questoes: [],
  isGenerating: false,
  generationStep: '',
  error: null,
  totalGenerated: 0,

  setConfig: (config) => set({ config }),

  navigateToGenerator: (config) =>
    set({
      currentView: 'generator',
      config,
      questoes: [],
      totalGenerated: 0,
      error: null,
    }),

  goBack: () =>
    set({
      currentView: 'main',
      questoes: [],
      isGenerating: false,
      generationStep: '',
      error: null,
      totalGenerated: 0,
    }),

  setIsGenerating: (val) => set({ isGenerating: val }),
  setGenerationStep: (step) => set({ generationStep: step }),
  setError: (error) => set({ error }),

  addQuestoes: (novas) =>
    set((state) => ({
      questoes: [...state.questoes, ...novas],
      totalGenerated: state.totalGenerated + novas.length,
    })),

  reset: () =>
    set({
      currentView: 'main',
      config: DEFAULT_CONFIG,
      questoes: [],
      isGenerating: false,
      generationStep: '',
      error: null,
      totalGenerated: 0,
    }),
}));
