/**
 * App.tsx — Aplicação Principal da Plataforma de Questões
 *
 * Estrutura:
 * - Header Superior com widget de Ofensiva (Streaks) e navegação completa:
 *   1. 📚 Questões (Filtros Avançados, Busca Semântica IA, Chips de Carreira)
 *   2. 📊 Desempenho (Métricas, KPIs, Rendimento por Disciplina e Banca)
 *   3. 📓 Caderno & Revisão (Erros, Revisão Espaçada, Favoritas)
 *   4. 🃏 Flashcards (Modo Anki / SM-2)
 *   5. 🎯 Raio-X da Banca (Assuntos e disciplinas mais cobrados)
 *   6. 🗺️ Edital Verticalizado (Checklist com acompanhamento)
 *   7. ⏱️ Simulados (Geral e Regra Cebraspe com nota líquida)
 *   8. 📋 Plano de Estudos (Metas diárias por concurso)
 *   9. 🌐 Cobertura da Base (Auditoria transparente da base)
 * - Botão de destaque "Hacker de Bancas" para geração de inéditas por IA
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GraduationCap, Search, ChevronLeft, ChevronRight, Loader2,
  Sparkles, BrainCircuit, Filter, AlertCircle, BarChart3,
  BookMarked, Award, Database, Flame, Layers,
  ListChecks, Compass, Maximize2, Minimize2, Zap
} from 'lucide-react';
import { AdvancedFilterBar } from './components/AdvancedFilterBar/AdvancedFilterBar';
import { QuestionCard } from './components/QuestionCard/QuestionCard';
import { GeneratorModal } from './components/GeneratorModal/GeneratorModal';
import { GeneratedQuestionsPage } from './components/GeneratedQuestionsPage/GeneratedQuestionsPage';
import type { NotebookTab } from './components/Study/StudyNotebookView';

// Code-Splitting e Lazy Loading de alta performance
const StudyDashboardView = lazy(() => import('./components/Study/StudyDashboardView').then(m => ({ default: m.StudyDashboardView })));
const StudyNotebookView = lazy(() => import('./components/Study/StudyNotebookView').then(m => ({ default: m.StudyNotebookView })));
const StudyPlanView = lazy(() => import('./components/Study/StudyPlanView').then(m => ({ default: m.StudyPlanView })));
const SmartSimuladoView = lazy(() => import('./components/Study/SmartSimuladoView').then(m => ({ default: m.SmartSimuladoView })));
const DatabaseCoverageView = lazy(() => import('./components/Study/DatabaseCoverageView').then(m => ({ default: m.DatabaseCoverageView })));
const FlashcardsView = lazy(() => import('./components/Study/FlashcardsView').then(m => ({ default: m.FlashcardsView })));
const RaioXView = lazy(() => import('./components/Study/RaioXView').then(m => ({ default: m.RaioXView })));
const EditalVerticalizadoView = lazy(() => import('./components/Study/EditalVerticalizadoView').then(m => ({ default: m.EditalVerticalizadoView })));
const MentoriaPerformanceView = lazy(() => import('./components/Study/MentoriaPerformanceView').then(m => ({ default: m.MentoriaPerformanceView })));
const SkillsHubView = lazy(() => import('./components/Study/SkillsHubView').then(m => ({ default: m.SkillsHubView })));
import { LoginView } from './components/Auth/LoginView';
import { AdminPanelView } from './components/Auth/AdminPanelView';
import { useAuthStore } from './stores/authStore';

function ViewLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-surface-400 gap-3">
      <Loader2 size={36} className="animate-spin text-primary-400" />
      <span className="text-sm font-semibold tracking-wide">Carregando módulo de estudos...</span>
    </div>
  );
}
import { useFilterStore } from './stores/filterStore';
import { useGeneratorStore } from './stores/generatorStore';
import { fetchQuestoes, fetchBuscaSemantica, fetchUserStreak } from './api/client';
import type { Questao } from './types';


type MainNavTab =
  | 'banco'
  | 'desempenho'
  | 'caderno'
  | 'flashcards'
  | 'raiox'
  | 'edital'
  | 'simulado'
  | 'plano'
  | 'mentoria'
  | 'skills'
  | 'cobertura'
  | 'admin';

const CARREIRAS = [
  { id: '', label: 'Todas as Carreiras', icon: '🏛️' },
  { id: 'Policial', label: 'Policial', desc: 'PF, PRF, PC, PM, Penal', icon: '👮' },
  { id: 'Tribunais', label: 'Tribunais', desc: 'TJ, TRT, TRE, TRF', icon: '⚖️' },
  { id: 'Fiscal', label: 'Fiscal & Controle', desc: 'Receita, SEFAZ, TCU', icon: '📈' },
  { id: 'Administrativa', label: 'Administrativa & Bancária', desc: 'BB, Caixa, INSS', icon: '💼' },
  { id: 'Educação', label: 'Educação', desc: 'Professores, Universidades', icon: '🎓' },
  { id: 'Saúde', label: 'Saúde', desc: 'Médicos, Enfermagem', icon: '🩺' },
];

function QuestoesMainContent({
  onOpenGenerator,
}: {
  onOpenGenerator: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'filtro' | 'semantica'>('filtro');
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticSearchTerm, setSemanticSearchTerm] = useState('');
  const [selectedCarreira, setSelectedCarreira] = useState('');

  const {
    concursoId,
    search,
    disciplinaId,
    assuntoId,
    bancaId,
    instituicao,
    ano,
    cargo,
    nivel,
    areaFormacao,
    areaAtuacao,
    modalidade,
    dificuldade,
    excluir,
    com,
    modoAba,
    page,
    setPage,
    setSearch,
  } = useFilterStore();

  function handleCarreiraClick(carreiraId: string) {
    setSelectedCarreira(carreiraId);
    setSearch(carreiraId);
  }

  // Query 1: Filtros tradicionais
  const { data: filterData, isLoading: isFilterLoading, isFetching: isFilterFetching, refetch } = useQuery({
    queryKey: [
      'questoes',
      concursoId,
      search,
      disciplinaId,
      assuntoId,
      bancaId,
      instituicao,
      ano,
      cargo,
      nivel,
      areaFormacao,
      areaAtuacao,
      modalidade,
      dificuldade,
      excluir.ineditas,
      excluir.anuladas,
      excluir.desatualizadas,
      com.gabaritoComentado,
      com.comentarios,
      com.aulas,
      modoAba,
      page,
    ],
    queryFn: () =>
      fetchQuestoes({
        concurso_id: concursoId || undefined,
        search: search || undefined,
        disciplina_id: disciplinaId || undefined,
        assunto_id: assuntoId || undefined,
        banca_id: bancaId || undefined,
        instituicao: instituicao || undefined,
        ano: ano || undefined,
        cargo: cargo || undefined,
        nivel: nivel || undefined,
        area_formacao: areaFormacao || undefined,
        area_atuacao: areaAtuacao || undefined,
        tipo_questao: modalidade || undefined,
        dificuldade: dificuldade || undefined,
        excluir_ineditas: excluir.ineditas,
        excluir_anuladas: excluir.anuladas,
        excluir_desatualizadas: excluir.desatualizadas,
        com_gabarito_comentado: com.gabaritoComentado,
        com_comentarios: com.comentarios,
        com_aulas: com.aulas,
        modo: modoAba,
        page,
        limit: 20,
      }),
    enabled: activeTab === 'filtro',
    staleTime: 2 * 60 * 1000,
  });

  // Query 2: Busca Semântica (pgvector)
  const { data: semanticData, isLoading: isSemanticLoading, isFetching: isSemanticFetching } = useQuery({
    queryKey: ['busca-semantica', semanticSearchTerm],
    queryFn: () => fetchBuscaSemantica({ q: semanticSearchTerm, limit: 30 }),
    enabled: activeTab === 'semantica' && semanticSearchTerm.length >= 3,
    staleTime: 5 * 60 * 1000,
  });

  function handleSemanticSearch(e: React.FormEvent) {
    e.preventDefault();
    if (semanticQuery.trim().length >= 3) {
      setSemanticSearchTerm(semanticQuery.trim());
    }
  }

  const questoes: Questao[] = activeTab === 'filtro'
    ? (filterData?.items || [])
    : (semanticData?.items || []);

  const total = activeTab === 'filtro' ? (filterData?.total || 0) : (semanticData?.total || 0);
  const totalPages = Math.ceil(total / 20);
  const isLoading = activeTab === 'filtro' ? isFilterLoading : isSemanticLoading;
  const isFetching = activeTab === 'filtro' ? isFilterFetching : isSemanticFetching;

  return (
    <div className="w-full space-y-4">
      {/* Chips Rápidos de Carreira */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        <span className="text-xs font-semibold text-surface-400 shrink-0">Carreiras:</span>
        {CARREIRAS.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCarreiraClick(c.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedCarreira === c.id
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                : 'glass border border-surface-700/50 text-surface-300 hover:text-surface-100 hover:border-surface-600'
            }`}
          >
            <span>{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <main className="w-full min-w-0">
        {/* Barra superior de controle e alternador de modo */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          {/* Alternador de Modo */}
          <div className="flex items-center p-1.5 rounded-2xl glass border border-surface-700/50">
            <button
              onClick={() => setActiveTab('filtro')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'filtro'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <Filter size={14} />
              <span>Painel de Filtros</span>
            </button>
            <button
              onClick={() => setActiveTab('semantica')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'semantica'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <BrainCircuit size={14} />
              <span>Busca Semântica IA</span>
            </button>
          </div>

          {/* Contador de resultados e Botão Ação IA */}
          <div className="flex items-center gap-4">
            <div className="text-xs sm:text-sm text-surface-400">
              <span className="font-semibold text-surface-200">{total}</span> questão{total !== 1 ? 'ões' : ''} encontrada{total !== 1 ? 's' : ''}
              {isFetching && <Loader2 size={13} className="inline ml-2 animate-spin text-primary-400" />}
            </div>
            <button
              onClick={onOpenGenerator}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs sm:text-sm hover:opacity-95 transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Hacker de Bancas (Inéditas)</span>
            </button>
          </div>
        </div>

        {/* PAINEL DE FILTROS AVANÇADO */}
        {activeTab === 'filtro' && (
          <AdvancedFilterBar onFiltrar={() => refetch()} />
        )}

        {/* MODO BUSCA SEMÂNTICA */}
        {activeTab === 'semantica' && (
          <div className="mb-8 p-6 rounded-3xl glass border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-surface-900/40">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <BrainCircuit size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-surface-100">Busca Semântica Vetorial (pgvector)</h3>
                <p className="text-xs text-surface-400">Encontre questões pelo conceito ou tema, mesmo sem palavras exatas</p>
              </div>
            </div>

            <form onSubmit={handleSemanticSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                <input
                  type="text"
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  placeholder="Pesquise por tema ou dúvida em linguagem natural (ex: licitação inexigibilidade notória especialização)..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 border border-emerald-500/30"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/25 shrink-0 cursor-pointer"
              >
                <Search size={16} />
                <span>Buscar</span>
              </button>
            </form>
          </div>
        )}

        {/* Estado vazio de busca semântica */}
        {activeTab === 'semantica' && !semanticSearchTerm && (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl glass border border-surface-700/40 p-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-700/10 flex items-center justify-center mb-6">
              <BrainCircuit size={36} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-surface-200 mb-2">
              Pronto para Busca Semântica
            </h3>
            <p className="text-sm text-surface-400 max-w-md">
              Digite acima o tema, doutrina ou situação fática que deseja estudar para encontrar as questões mais parecidas no banco vetorial.
            </p>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl glass p-6 space-y-3">
                <div className="skeleton h-8 w-3/4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="space-y-2 mt-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="skeleton h-12 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista de Questões Renderizadas */}
        {!isLoading && (activeTab === 'filtro' || (activeTab === 'semantica' && semanticSearchTerm)) && (
          <div className="space-y-5">
            {questoes.length === 0 ? (
              <div className="text-center py-16 text-surface-400 text-sm glass rounded-2xl p-6">
                <AlertCircle size={24} className="mx-auto mb-2 text-surface-500" />
                Nenhuma questão encontrada para a busca informada.
              </div>
            ) : (
              questoes.map((q, i) => (
                <QuestionCard key={q.id} questao={q} index={i} />
              ))
            )}
          </div>
        )}

        {/* Paginação */}
        {activeTab === 'filtro' && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8 pb-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2.5 rounded-xl glass text-surface-300 hover:text-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (page > 3 && page < totalPages - 2) pageNum = page - 2 + i;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      pageNum === page
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                        : 'glass text-surface-300 hover:text-surface-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2.5 rounded-xl glass text-surface-300 hover:text-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [currentNavTab, setCurrentNavTab] = useState<MainNavTab>('banco');
  const [notebookTab, setNotebookTab] = useState<NotebookTab>('errors');
  const currentView = useGeneratorStore((s) => s.currentView);
  const setDisciplinaId = useFilterStore((s) => s.setDisciplinaId);

  const isAuthenticated = useAuthStore(s => s.isAuthenticated());
  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);

  // Widget de Ofensiva (Streaks)
  const { data: streakData } = useQuery({
    queryKey: ['study-streak'],
    queryFn: fetchUserStreak,
    staleTime: 30 * 1000,
  });

  function handleStartStudyDiscipline(disciplinaId: string) {
    setDisciplinaId(disciplinaId);
    setCurrentNavTab('banco');
  }

  function handleGoToErrors() {
    setNotebookTab('errors');
    setCurrentNavTab('caderno');
  }

  function handleGoToReviews() {
    setNotebookTab('reviews');
    setCurrentNavTab('caderno');
  }

  const [isZenMode, setIsZenMode] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

  function handleStartSimulado() {
    setCurrentNavTab('simulado');
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return currentView === 'generator' ? (
    <GeneratedQuestionsPage />
  ) : (
    <div className="min-h-screen bg-surface-950 text-surface-100">
          {/* Header Superior — Normal ou Barra Zen */}
          {isZenMode ? (
            <div className="sticky top-0 z-40 px-6 py-2.5 bg-surface-950/95 backdrop-blur-xl border-b border-surface-800 flex items-center justify-between text-xs text-surface-400">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Maximize2 size={13} /> Modo Foco / Zen Ativo
              </span>
              <button
                onClick={() => setIsZenMode(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 cursor-pointer font-medium transition-all"
              >
                <Minimize2 size={13} /> Sair do Modo Zen (Esc)
              </button>
            </div>
          ) : (
            <header className="sticky top-0 z-40 glass border-b border-surface-700/30 bg-surface-950/85 backdrop-blur-xl">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Logo, Título e Widget de Ofensiva */}
              <div className="flex items-center justify-between w-full md:w-auto gap-4">
                <div
                  onClick={() => setCurrentNavTab('banco')}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-600/20 group-hover:scale-105 transition-all">
                    <GraduationCap size={22} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-surface-100 leading-tight">
                      Questões de Concurso
                    </h1>
                    <p className="text-[11px] text-surface-400">Plataforma Completa & IA Socrática</p>
                  </div>
                </div>

                {/* Widget de Ofensiva & Metas */}
                {streakData && (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl glass border border-amber-500/30 bg-amber-950/20 text-xs shrink-0">
                    <div className="flex items-center gap-1 font-bold text-amber-300">
                      <Flame size={14} className="text-amber-400 fill-amber-400 animate-pulse" />
                      <span>{streakData.dias_consecutivos}d</span>
                    </div>
                    <div className="h-3 w-px bg-surface-700/60" />
                    <div className="hidden sm:flex items-center gap-1.5 text-surface-300">
                      <span>Meta: <strong className="text-surface-100">{streakData.respondidas_hoje}</strong>/{streakData.meta_diaria}</span>
                      <div className="w-8 h-1.5 rounded-full bg-surface-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(100, (streakData.respondidas_hoje / streakData.meta_diaria) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Botão Mobile do Gerador */}
                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="md:hidden p-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs shadow-md cursor-pointer"
                >
                  <Sparkles size={16} />
                </button>
                
                <button
                  onClick={logout}
                  title="Sair"
                  className="p-2.5 rounded-2xl glass hover:bg-surface-800 text-surface-400 hover:text-red-400 cursor-pointer transition-all border border-surface-700/50"
                >
                  Sair
                </button>
              </div>

              {/* Menu de Navegação Superior (Tabs de Produto) */}
              <nav className="flex items-center gap-1 overflow-x-auto max-w-full p-1 rounded-2xl glass border border-surface-700/50">
                <button
                  onClick={() => setCurrentNavTab('banco')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'banco'
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Search size={13} />
                  <span>Questões</span>
                </button>

                <button
                  onClick={() => setCurrentNavTab('desempenho')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'desempenho'
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <BarChart3 size={13} />
                  <span>Desempenho</span>
                </button>

                <button
                  onClick={() => {
                    setNotebookTab('errors');
                    setCurrentNavTab('caderno');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'caderno'
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <BookMarked size={13} />
                  <span>Caderno & Revisão</span>
                </button>

                <button
                  onClick={() => setCurrentNavTab('flashcards')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'flashcards'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Layers size={13} />
                  <span>Flashcards</span>
                </button>

                <button
                  onClick={() => setCurrentNavTab('raiox')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'raiox'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Flame size={13} />
                  <span>Raio-X</span>
                </button>

                <button
                  onClick={() => setCurrentNavTab('edital')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'edital'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <ListChecks size={13} />
                  <span>Edital Verticalizado</span>
                </button>

                <button
                  onClick={() => setCurrentNavTab('simulado')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'simulado'
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Award size={13} />
                  <span>Simulados</span>
                </button>

                <button
                  onClick={() => setCurrentNavTab('plano')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'plano'
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Compass size={13} />
                  <span>Plano de Estudos</span>
                </button>

                <button
                  onClick={() => setCurrentNavTab('mentoria')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'mentoria'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Sparkles size={13} className="text-amber-300" />
                  <span>Mentoria VIP & Redação</span>
                </button>

                <button
                  onClick={() => setCurrentNavTab('skills')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'skills'
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Zap size={13} className="text-amber-300 animate-pulse" />
                  <span>Skills IA</span>
                </button>

                <button
                  onClick={() => setCurrentNavTab('cobertura')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentNavTab === 'cobertura'
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Database size={13} />
                  <span>Cobertura</span>
                </button>

                {user?.is_master && (
                  <button
                    onClick={() => setCurrentNavTab('admin')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      currentNavTab === 'admin'
                        ? 'bg-amber-500 text-surface-950 shadow-md shadow-amber-500/30 font-bold'
                        : 'text-amber-400/70 hover:text-amber-400'
                    }`}
                  >
                    <span>🔑</span>
                    <span>Admin</span>
                  </button>
                )}

              </nav>

              {/* Botões Desktop: Modo Zen e Hacker de Bancas */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => setIsZenMode(true)}
                  title="Ativar Modo Foco / Zen (Oculta distrações)"
                  className="px-3 py-2.5 rounded-xl border border-surface-700/60 hover:bg-surface-800/80 text-surface-300 hover:text-surface-100 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Maximize2 size={14} />
                  <span>Modo Foco</span>
                </button>
                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/25 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles size={15} className="text-purple-200" />
                  <span>Hacker de Bancas (Inéditas)</span>
                </button>
              </div>
            </div>
          </header>
          )}

          {/* Área Central de Conteúdo com Suspense para Lazy Loading */}
          <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <Suspense fallback={<ViewLoadingSkeleton />}>
              {currentNavTab === 'banco' && (
                <QuestoesMainContent onOpenGenerator={() => setIsGeneratorOpen(true)} />
              )}

              {currentNavTab === 'desempenho' && (
                <StudyDashboardView
                  onGoToErrors={handleGoToErrors}
                  onGoToReviews={handleGoToReviews}
                  onStartSimulado={handleStartSimulado}
                />
              )}

              {currentNavTab === 'caderno' && (
                <StudyNotebookView initialTab={notebookTab} />
              )}

              {currentNavTab === 'flashcards' && (
                <FlashcardsView />
              )}

              {currentNavTab === 'raiox' && (
                <RaioXView onStartPractice={() => setCurrentNavTab('banco')} />
              )}

              {currentNavTab === 'edital' && (
                <EditalVerticalizadoView onStartPracticeTopic={() => setCurrentNavTab('banco')} />
              )}

              {currentNavTab === 'plano' && (
                <StudyPlanView onStartStudyDiscipline={handleStartStudyDiscipline} />
              )}

              {currentNavTab === 'simulado' && (
                <SmartSimuladoView onBackToHub={() => setCurrentNavTab('banco')} />
              )}

              {currentNavTab === 'mentoria' && (
                <MentoriaPerformanceView />
              )}

              {currentNavTab === 'skills' && (
                <SkillsHubView />
              )}

              {currentNavTab === 'cobertura' && (
                <DatabaseCoverageView />
              )}

              {currentNavTab === 'admin' && user?.is_master && (
                <AdminPanelView />
              )}

            </Suspense>
          </main>

          {/* Modal do Gerador de Inéditas */}
          <GeneratorModal
            isOpen={isGeneratorOpen}
            onClose={() => setIsGeneratorOpen(false)}
          />
        </div>
  );
}

export default App;
