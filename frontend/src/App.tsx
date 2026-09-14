/**
 * App.tsx — Página principal da plataforma
 *
 * Layout:
 * - Navbar com switcher de modo ("Filtros Cascata" vs "Busca Semântica IA")
 *   e botão de abertura do "Hacker de Bancas (Gerador de Inéditas)"
 * - Sidebar de filtros (esquerda) + Lista de questões (direita)
 * - Suporte a busca semântica em tempo real via pgvector
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  GraduationCap, Search, ChevronLeft, ChevronRight, Loader2, FileQuestion,
  Sparkles, BrainCircuit, Filter, Compass, AlertCircle
} from 'lucide-react';
import { FilterPanel } from './components/FilterPanel/FilterPanel';
import { QuestionCard } from './components/QuestionCard/QuestionCard';
import { GeneratorModal } from './components/GeneratorModal/GeneratorModal';
import { useFilterStore } from './stores/filterStore';
import { fetchQuestoes, fetchBuscaSemantica } from './api/client';
import type { Questao } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

function QuestoesMainContent({
  onOpenGenerator,
  customQuestoes,
}: {
  onOpenGenerator: () => void;
  customQuestoes: Questao[];
}) {
  const [activeTab, setActiveTab] = useState<'filtro' | 'semantica'>('filtro');
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticSearchTerm, setSemanticSearchTerm] = useState('');

  const { concursoId, disciplinaId, assuntoId, search, page, setSearch, setPage } = useFilterStore();

  // Query 1: Filtros tradicionais
  const { data: filterData, isLoading: isFilterLoading, isFetching: isFilterFetching } = useQuery({
    queryKey: ['questoes', concursoId, disciplinaId, assuntoId, search, page],
    queryFn: () =>
      fetchQuestoes({
        concurso_id: concursoId || undefined,
        disciplina_id: disciplinaId || undefined,
        assunto_id: assuntoId || undefined,
        search: search || undefined,
        page,
        limit: 20,
      }),
    enabled: activeTab === 'filtro' && !!concursoId,
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

  const questoes = activeTab === 'filtro'
    ? [...customQuestoes, ...(filterData?.items || [])]
    : (semanticData?.items || []);

  const total = activeTab === 'filtro' ? (filterData?.total || 0) : (semanticData?.total || 0);
  const totalPages = Math.ceil(total / 20);
  const isLoading = activeTab === 'filtro' ? isFilterLoading : isSemanticLoading;
  const isFetching = activeTab === 'filtro' ? isFilterFetching : isSemanticFetching;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar de filtros (exibida apenas no modo filtro) */}
      {activeTab === 'filtro' && <FilterPanel />}

      <main className="flex-1 min-w-0">
        {/* Barra superior de controle e abas */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          {/* Alternador de Modo */}
          <div className="flex items-center p-1.5 rounded-2xl glass border border-surface-700/50">
            <button
              onClick={() => setActiveTab('filtro')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'filtro'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <Filter size={15} />
              <span>Filtros por Prova</span>
            </button>

            <button
              onClick={() => setActiveTab('semantica')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'semantica'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <BrainCircuit size={15} />
              <span>Busca Semântica IA</span>
            </button>
          </div>

          {/* Contador de resultados */}
          <div className="text-xs sm:text-sm text-surface-400">
            {(concursoId || activeTab === 'semantica') && (
              <p>
                {total} questão{total !== 1 ? 'ões' : ''} encontrada{total !== 1 ? 's' : ''}
                {isFetching && <Loader2 size={12} className="inline ml-2 animate-spin text-primary-400" />}
              </p>
            )}
          </div>
        </div>

        {/* MODO BUSCA SEMÂNTICA: Barra de Pesquisa em Linguagem Natural */}
        {activeTab === 'semantica' && (
          <div className="mb-8 p-6 rounded-3xl glass border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-transparent space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Compass size={16} />
              <span>Busca Inteligente por Significado e Conceito Jurídico</span>
            </div>
            <p className="text-xs text-surface-400">
              Digite conceitos amplos (ex: <em className="text-emerald-300">"crimes contra a administração"</em>, <em className="text-emerald-300">"artigo 5 direitos fundamentais"</em>, <em className="text-emerald-300">"estabilidade do servidor público no DF"</em>). O pgvector localizará as questões mais relevantes mesmo sem correspondência exata de palavras.
            </p>

            <form onSubmit={handleSemanticSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  placeholder="Pesquise por tema ou dúvida em linguagem natural..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl glass text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 border border-emerald-500/30"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/25 shrink-0"
              >
                <Search size={16} />
                <span>Buscar</span>
              </button>
            </form>
          </div>
        )}

        {/* MODO FILTROS: Header de busca de texto normal */}
        {activeTab === 'filtro' && concursoId && (
          <div className="relative w-full mb-6">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar palavra-chave no enunciado..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-surface-100
                       placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>
        )}

        {/* Estado vazio quando nenhum concurso selecionado */}
        {activeTab === 'filtro' && !concursoId && (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl glass border border-surface-700/40 p-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500/20 to-primary-700/10 flex items-center justify-center mb-6 shadow-inner">
              <FileQuestion size={36} className="text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-surface-200 mb-2">
              Selecione um concurso no menu lateral
            </h3>
            <p className="text-sm text-surface-400 max-w-md mb-6">
              Navegue pelos concursos oficiais das principais bancas do Brasil ou use a Inteligência Artificial para gerar questões inéditas simuladas.
            </p>
            <button
              onClick={onOpenGenerator}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs sm:text-sm hover:opacity-95 transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20"
            >
              <Sparkles size={16} />
              <span>Experimentar Hacker de Bancas (Inéditas)</span>
            </button>
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
        {!isLoading && (concursoId || (activeTab === 'semantica' && semanticSearchTerm)) && (
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

        {/* Paginação para o modo filtro */}
        {activeTab === 'filtro' && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8 pb-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2.5 rounded-xl glass text-surface-300 hover:text-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
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
              className="p-2.5 rounded-xl glass text-surface-300 hover:text-surface-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
  const [customQuestoes, setCustomQuestoes] = useState<Questao[]>([]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-surface-950 text-surface-100">
        {/* Navbar */}
        <header className="sticky top-0 z-40 glass border-b border-surface-700/30 bg-surface-950/80 backdrop-blur-xl">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-600/20">
                <GraduationCap size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-surface-100 leading-tight">
                  Questões de Concurso
                </h1>
                <p className="text-xs text-surface-400">Plataforma de Alta Performance & Busca Vetorial</p>
              </div>
            </div>

            {/* Ação Principal: Hacker de Bancas */}
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 transition-all duration-200 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={16} className="text-purple-200" />
              <span className="hidden sm:inline">Hacker de Bancas</span>
              <span>(Gerar Inédita)</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="max-w-screen-2xl mx-auto px-6 py-8">
          <QuestoesMainContent
            onOpenGenerator={() => setIsGeneratorOpen(true)}
            customQuestoes={customQuestoes}
          />
        </div>

        {/* Modal do Gerador */}
        <GeneratorModal
          isOpen={isGeneratorOpen}
          onClose={() => setIsGeneratorOpen(false)}
          onQuestionGenerated={(novaQuestao) => {
            setCustomQuestoes((prev) => [novaQuestao, ...prev]);
          }}
        />
      </div>
    </QueryClientProvider>
  );
}

export default App;
