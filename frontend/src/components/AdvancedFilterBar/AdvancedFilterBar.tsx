/**
 * AdvancedFilterBar — Barra de filtros completa inspirada no layout padrão
 * de plataformas líderes de questões de concursos públicos.
 *
 * Funcionalidades:
 * - Abas: [Questões Objetivas] vs [Exercícios de Fixação]
 * - Linha 1: Palavra Chave, Disciplina, Assunto, Banca, Instituição, Ano
 * - Linha 2: Cargo, Nível, Área de Formação, Área de Atuação, Modalidade, Dificuldade
 * - Checkboxes: Excluir questões & Questões com
 * - Alternador: Mostrar filtro simples / Mostrar mais filtros
 * - Barra inferior: "Filtrar por:" com tags interativas descartáveis
 * - Ações: Salvar Filtros, Limpar, Filtrar
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  RotateCcw,
  Bookmark,
  ChevronDown,
  ChevronUp,
  X,
  ListFilter,
  CheckCircle2,
  BookMarked,
  Building2,
  Check,
  Sparkles,
} from 'lucide-react';
import { useFilterStore } from '../../stores/filterStore';
import { fetchFiltrosOpcoes } from '../../api/client';

interface AdvancedFilterBarProps {
  onFiltrar?: () => void;
}

export function AdvancedFilterBar({ onFiltrar }: AdvancedFilterBarProps) {
  const {
    modoAba,
    concursoId,
    concursoSelecionado,
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
    showMoreFilters,
    setModoAba,
    setSearch,
    setConcurso,
    setDisciplinaId,
    setAssuntoId,
    setBancaId,
    setInstituicao,
    setAno,
    setCargo,
    setNivel,
    setAreaFormacao,
    setAreaAtuacao,
    setModalidade,
    setDificuldade,
    toggleExcluir,
    toggleCom,
    setShowMoreFilters,
    removeFilter,
    salvarFiltros,
    resetAll,
  } = useFilterStore();

  const [localSearch, setLocalSearch] = useState(search);
  const [saveToast, setSaveToast] = useState(false);

  // Estados do seletor dropdown pesquisável de Concurso
  const [isConcursoOpen, setIsConcursoOpen] = useState(false);
  const [concursoSearch, setConcursoSearch] = useState('');
  const concursoDropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown de concurso ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (concursoDropdownRef.current && !concursoDropdownRef.current.contains(e.target as Node)) {
        setIsConcursoOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca opções dinâmicas da API (ditadas por concursoId e nivel)
  const { data: opcoes, isLoading: isOpcoesLoading } = useQuery({
    queryKey: ['filtros-opcoes', concursoId, nivel],
    queryFn: () =>
      fetchFiltrosOpcoes({
        concurso_id: concursoId || undefined,
        nivel: nivel || undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });

  // Concursos filtrados pela busca local no dropdown
  const concursosFiltrados = useMemo(() => {
    if (!opcoes?.concursos) return [];
    let list = opcoes.concursos;

    if (concursoSearch.trim()) {
      const term = concursoSearch.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.orgao.toLowerCase().includes(term) ||
          c.cargo.toLowerCase().includes(term) ||
          c.banca_nome.toLowerCase().includes(term) ||
          String(c.ano).includes(term) ||
          (c.nome && c.nome.toLowerCase().includes(term))
      );
    }

    return list;
  }, [opcoes?.concursos, concursoSearch]);


  const activeConcurso = useMemo(() => {
    if (!concursoId) return null;
    return opcoes?.concursos?.find((c) => c.id === concursoId) || concursoSelecionado;
  }, [concursoId, opcoes?.concursos, concursoSelecionado]);

  // Assuntos filtrados pela disciplina selecionada
  const listaAssuntos = opcoes?.assuntos;
  const assuntosDisponiveis = useMemo(() => {
    if (!listaAssuntos) return [];
    if (!disciplinaId) return listaAssuntos;
    return listaAssuntos.filter((a) => a.disciplina_id === disciplinaId);
  }, [listaAssuntos, disciplinaId]);

  // Lista de tags de filtros ativos
  const activeFilterTags = useMemo(() => {
    const tags: { id: string; label: string; value: string }[] = [];

    if (concursoId) {
      const label = activeConcurso
        ? `${activeConcurso.orgao} — ${activeConcurso.cargo} (${activeConcurso.ano})`
        : 'Certame Ativo';
      tags.push({ id: 'concursoId', label: 'Concurso', value: label });
    }

    if (search.trim()) {
      tags.push({ id: 'search', label: 'Palavra-chave', value: `"${search}"` });
    }

    if (disciplinaId && opcoes?.disciplinas) {
      const d = opcoes.disciplinas.find((item) => item.id === disciplinaId);
      if (d) tags.push({ id: 'disciplinaId', label: 'Disciplina', value: d.nome });
    }

    if (assuntoId && opcoes?.assuntos) {
      const a = opcoes.assuntos.find((item) => item.id === assuntoId);
      if (a) tags.push({ id: 'assuntoId', label: 'Assunto', value: a.nome });
    }

    if (bancaId && opcoes?.bancas) {
      const b = opcoes.bancas.find((item) => item.id === bancaId);
      if (b) tags.push({ id: 'bancaId', label: 'Banca', value: b.nome });
    }

    if (instituicao) {
      tags.push({ id: 'instituicao', label: 'Instituição', value: instituicao });
    }

    if (ano) {
      tags.push({ id: 'ano', label: 'Ano', value: String(ano) });
    }

    if (cargo) {
      tags.push({ id: 'cargo', label: 'Cargo', value: cargo });
    }

    if (nivel) {
      tags.push({ id: 'nivel', label: 'Nível', value: nivel });
    }

    if (areaFormacao) {
      tags.push({ id: 'areaFormacao', label: 'Formação', value: areaFormacao });
    }

    if (areaAtuacao) {
      tags.push({ id: 'areaAtuacao', label: 'Atuação', value: areaAtuacao });
    }

    if (modalidade) {
      tags.push({ id: 'modalidade', label: 'Modalidade', value: modalidade });
    }

    if (dificuldade) {
      tags.push({ id: 'dificuldade', label: 'Dificuldade', value: dificuldade });
    }

    // Checkboxes excluir
    if (excluir.meusCadernos) tags.push({ id: 'meusCadernos', label: 'Excluir', value: 'Dos meus cadernos' });
    if (excluir.meusSimulados) tags.push({ id: 'meusSimulados', label: 'Excluir', value: 'Dos meus simulados' });
    if (excluir.ineditas) tags.push({ id: 'ineditas', label: 'Excluir', value: 'Inéditas (IA)' });
    if (excluir.anuladas) tags.push({ id: 'anuladas', label: 'Excluir', value: 'Anuladas' });
    if (excluir.desatualizadas) tags.push({ id: 'desatualizadas', label: 'Excluir', value: 'Desatualizadas' });

    // Checkboxes com
    if (com.gabaritoComentado) tags.push({ id: 'gabaritoComentado', label: 'Com', value: 'Gabarito Comentado' });
    if (com.comentarios) tags.push({ id: 'comentarios', label: 'Com', value: 'Comentários' });
    if (com.meusComentarios) tags.push({ id: 'meusComentarios', label: 'Com', value: 'Meus Comentários' });
    if (com.aulas) tags.push({ id: 'aulas', label: 'Com', value: 'Aulas' });
    if (com.minhasAnotacoes) tags.push({ id: 'minhasAnotacoes', label: 'Com', value: 'Minhas Anotações' });

    return tags;
  }, [
    concursoId,
    activeConcurso,
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
    opcoes,
  ]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(localSearch.trim());
    if (onFiltrar) onFiltrar();
  }

  function handleSalvar() {
    salvarFiltros();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  }

  function handleFiltrar() {
    setSearch(localSearch.trim());
    if (onFiltrar) onFiltrar();
  }

  return (
    <div className="w-full bg-[#f8fafc] dark:bg-surface-900/95 border border-slate-200 dark:border-surface-700/60 rounded-2xl shadow-sm overflow-hidden mb-6 transition-colors">
      {/* Abas Superiores */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-surface-800 bg-slate-100/70 dark:bg-surface-950/60 px-4 pt-2">
        <button
          onClick={() => setModoAba('objetivas')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold rounded-t-xl transition-all ${
            modoAba === 'objetivas'
              ? 'bg-[#f8fafc] dark:bg-surface-900 text-slate-800 dark:text-surface-100 border-t-2 border-primary-500 shadow-sm'
              : 'text-slate-500 dark:text-surface-400 hover:text-slate-700 dark:hover:text-surface-200'
          }`}
        >
          <ListFilter size={16} className={modoAba === 'objetivas' ? 'text-primary-500' : ''} />
          <span>Questões Objetivas</span>
        </button>

        <button
          onClick={() => setModoAba('fixacao')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold rounded-t-xl transition-all ${
            modoAba === 'fixacao'
              ? 'bg-[#f8fafc] dark:bg-surface-900 text-slate-800 dark:text-surface-100 border-t-2 border-emerald-500 shadow-sm'
              : 'text-slate-500 dark:text-surface-400 hover:text-slate-700 dark:hover:text-surface-200'
          }`}
        >
          <BookMarked size={16} className={modoAba === 'fixacao' ? 'text-emerald-500' : ''} />
          <span>Exercícios de Fixação</span>
        </button>
      </div>

      {/* Conteúdo dos Filtros */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* SELETOR MESTRE: Concurso com Busca Instantânea e Cascata Completa */}
        <div className="relative" ref={concursoDropdownRef}>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-surface-200">
              <Building2 size={15} className="text-primary-500" />
              <span>Concurso (Filtro Ditador de Edital & Questões)</span>
            </label>
            {opcoes?.concursos && (
              <span className="text-[11px] text-slate-500 dark:text-surface-400 hidden sm:inline">
                <span className="font-semibold text-primary-600 dark:text-primary-400">{opcoes.concursos.length}</span> concursos disponíveis • <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% com questões</span>
              </span>
            )}
          </div>

          {/* Botão Gatilho do Dropdown de Concursos */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConcursoOpen((prev) => !prev)}
              className={`flex-1 h-11 px-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-between gap-2 border transition-all text-left shadow-xs cursor-pointer ${
                concursoId
                  ? 'bg-primary-50/70 dark:bg-primary-950/30 border-primary-400/80 text-primary-950 dark:text-primary-100 ring-2 ring-primary-500/20'
                  : 'bg-white dark:bg-surface-800 text-slate-700 dark:text-surface-200 border-slate-300 dark:border-surface-700 hover:border-primary-400'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Building2 size={16} className={concursoId ? 'text-primary-600 dark:text-primary-400 shrink-0' : 'text-slate-400 shrink-0'} />
                {activeConcurso ? (
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <span className="font-bold text-slate-900 dark:text-surface-100 truncate">
                      {activeConcurso.orgao} — {activeConcurso.cargo}
                    </span>
                    <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary-200/80 dark:bg-primary-900/80 text-primary-800 dark:text-primary-200">
                      {activeConcurso.ano}
                    </span>
                    <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200 dark:bg-surface-700 text-slate-700 dark:text-surface-300 hidden md:inline">
                      {activeConcurso.banca_nome}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-500 dark:text-surface-400 truncate">
                    Todos os Concursos (selecione aqui para ditar as matérias e filtros pelo edital)...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {concursoId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConcurso(null);
                      if (onFiltrar) onFiltrar();
                    }}
                    title="Limpar concurso e liberar busca geral"
                    className="p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-500 hover:text-rose-700 transition-colors mr-1 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                )}
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${isConcursoOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {concursoId && (
              <button
                type="button"
                onClick={() => {
                  setConcurso(null);
                  if (onFiltrar) onFiltrar();
                }}
                className="h-11 px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 transition-colors shrink-0 hidden sm:flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Liberar Todos</span>
              </button>
            )}
          </div>

          {/* Menu Dropdown com Busca Inteligente */}
          <AnimatePresence>
            {isConcursoOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-surface-900 border border-slate-300 dark:border-surface-700 rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Cabeçalho do Dropdown com Campo de Busca e Indicador */}
                <div className="p-3 bg-slate-50 dark:bg-surface-950/70 border-b border-slate-200 dark:border-surface-800 space-y-2">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={concursoSearch}
                      onChange={(e) => setConcursoSearch(e.target.value)}
                      placeholder="Filtrar certame por órgão, cargo, banca ou ano (ex: INSS, PF, TJ, Vunesp, 2023)..."
                      autoFocus
                      className="w-full h-9 pl-9 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-2xs"
                    />
                    {concursoSearch && (
                      <button
                        type="button"
                        onClick={() => setConcursoSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Status e Indicador de Cobertura */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>Todos os <strong>{opcoes?.concursos?.length || 0}</strong> concursos possuem questões cadastradas</span>
                    </div>

                    {concursoId && (
                      <button
                        type="button"
                        onClick={() => {
                          setConcurso(null);
                          setIsConcursoOpen(false);
                          setConcursoSearch('');
                          if (onFiltrar) onFiltrar();
                        }}
                        className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Limpar Seleção
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de Concursos */}
                <div className="max-h-72 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100 dark:divide-surface-800/40">
                  {isOpcoesLoading ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Carregando certames...
                    </div>
                  ) : concursosFiltrados.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhum certame encontrado para "{concursoSearch}".
                    </div>
                  ) : (
                    concursosFiltrados.map((c) => {
                      const isSelected = c.id === concursoId;
                      const hasQuestions = (c.total_questoes || 0) > 0;

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setConcurso(c);
                            setIsConcursoOpen(false);
                            setConcursoSearch('');
                            if (onFiltrar) onFiltrar();
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-primary-50 dark:bg-primary-950/40 border border-primary-500/40'
                              : 'hover:bg-slate-100/80 dark:hover:bg-surface-800/70'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-xs sm:text-sm truncate ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-slate-800 dark:text-surface-100'}`}>
                                {c.orgao}
                              </span>
                              <span className="text-slate-400 dark:text-surface-500 text-xs">•</span>
                              <span className="text-xs text-slate-600 dark:text-surface-300 truncate">
                                {c.cargo}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-surface-400 flex-wrap">
                              <span className="font-semibold text-primary-600 dark:text-primary-400">
                                {c.banca_nome}
                              </span>
                              <span>•</span>
                              <span>Ano {c.ano}</span>
                              <span>•</span>
                              <span className="capitalize">{c.nivel}</span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {hasQuestions ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                {c.total_questoes} {c.total_questoes === 1 ? 'questão' : 'questões'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] text-slate-400 dark:text-surface-500 bg-slate-100 dark:bg-surface-800">
                                Edital
                              </span>
                            )}
                            {isSelected && <Check size={16} className="text-primary-600 dark:text-primary-400" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Banner Informativo de Concurso Ativo (Filtros Ditados pelo Edital) */}
          {activeConcurso && (
            <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent border border-primary-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={16} className="text-primary-500 shrink-0" />
                <div className="text-xs text-slate-700 dark:text-surface-200 min-w-0">
                  <span className="font-bold text-primary-700 dark:text-primary-300">Certame Ditador Ativo: </span>
                  <span className="font-semibold">{activeConcurso.orgao} ({activeConcurso.cargo}, {activeConcurso.ano})</span>.
                  <span className="text-slate-500 dark:text-surface-400 ml-1">
                    Banca, órgão, cargo e disciplinas foram calibrados exclusivamente para este edital.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConcurso(null);
                  if (onFiltrar) onFiltrar();
                }}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline shrink-0 cursor-pointer self-end sm:self-auto"
              >
                ✕ Desativar Certame
              </button>
            </div>
          )}
        </div>

        {/* Linha 1: 6 Filtros Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Palavra Chave */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Palavra Chave"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full h-10 pl-3 pr-9 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs"
            />
            <button
              type="submit"
              aria-label="Buscar palavra chave"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-slate-100 dark:bg-surface-700 text-slate-600 dark:text-surface-300 flex items-center justify-center hover:bg-primary-50 hover:text-primary-600 transition-colors"
            >
              <Search size={14} />
            </button>
          </form>

          {/* Disciplina */}
          <div className="relative">
            <select
              value={disciplinaId || ''}
              onChange={(e) => setDisciplinaId(e.target.value || null)}
              className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none truncate"
            >
              <option value="">Disciplina</option>
              {opcoes?.disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Assunto */}
          <div className="relative">
            <select
              value={assuntoId || ''}
              onChange={(e) => setAssuntoId(e.target.value || null)}
              className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none truncate"
            >
              <option value="">Assunto</option>
              {assuntosDisponiveis.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Banca */}
          <div className="relative">
            <select
              value={bancaId || ''}
              onChange={(e) => setBancaId(e.target.value || null)}
              className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none truncate"
            >
              <option value="">Banca</option>
              {opcoes?.bancas.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Instituição */}
          <div className="relative">
            <select
              value={instituicao || ''}
              onChange={(e) => setInstituicao(e.target.value || null)}
              className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none truncate"
            >
              <option value="">Instituição</option>
              {opcoes?.instituicoes.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Ano */}
          <div className="relative">
            <select
              value={ano || ''}
              onChange={(e) => setAno(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none"
            >
              <option value="">Ano</option>
              {opcoes?.anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Linha 2 & Checkboxes (Recolhíveis) */}
        <AnimatePresence>
          {showMoreFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 overflow-hidden pt-1"
            >
              {/* Linha 2: 6 Filtros Específicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Cargo */}
                <div className="relative">
                  <select
                    value={cargo || ''}
                    onChange={(e) => setCargo(e.target.value || null)}
                    className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none truncate"
                  >
                    <option value="">Cargo</option>
                    {opcoes?.cargos.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Nível */}
                <div className="relative">
                  <select
                    value={nivel || ''}
                    onChange={(e) => setNivel(e.target.value || null)}
                    className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none"
                  >
                    <option value="">Nível</option>
                    {opcoes?.niveis.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Área de Formação */}
                <div className="relative">
                  <select
                    value={areaFormacao || ''}
                    onChange={(e) => setAreaFormacao(e.target.value || null)}
                    className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none truncate"
                  >
                    <option value="">Área de Formação</option>
                    {opcoes?.areas_formacao.map((af) => (
                      <option key={af} value={af}>
                        {af}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Área de Atuação */}
                <div className="relative">
                  <select
                    value={areaAtuacao || ''}
                    onChange={(e) => setAreaAtuacao(e.target.value || null)}
                    className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none truncate"
                  >
                    <option value="">Área de Atuação</option>
                    {opcoes?.areas_atuacao.map((aa) => (
                      <option key={aa} value={aa}>
                        {aa}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Modalidade */}
                <div className="relative">
                  <select
                    value={modalidade || ''}
                    onChange={(e) => setModalidade(e.target.value || null)}
                    className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none"
                  >
                    <option value="">Modalidade</option>
                    {opcoes?.modalidades.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Dificuldade */}
                <div className="relative">
                  <select
                    value={dificuldade || ''}
                    onChange={(e) => setDificuldade(e.target.value || null)}
                    className="w-full h-10 px-3 pr-8 rounded-lg text-xs sm:text-sm bg-white dark:bg-surface-800 text-slate-800 dark:text-surface-100 border border-slate-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 shadow-xs appearance-none"
                  >
                    <option value="">Dificuldade</option>
                    {opcoes?.dificuldades.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Seção de Checkboxes */}
              <div className="pt-2 border-t border-slate-200/70 dark:border-surface-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Excluir questões */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-bold text-slate-700 dark:text-surface-200 mr-1 shrink-0">
                    Excluir questões
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-surface-300 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={excluir.meusCadernos}
                      onChange={() => toggleExcluir('meusCadernos')}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Dos meus cadernos</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-surface-300 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={excluir.meusSimulados}
                      onChange={() => toggleExcluir('meusSimulados')}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Dos meus simulados</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-surface-300 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={excluir.ineditas}
                      onChange={() => toggleExcluir('ineditas')}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Inéditas</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-surface-300 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={excluir.anuladas}
                      onChange={() => toggleExcluir('anuladas')}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Anuladas</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-surface-300 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={excluir.desatualizadas}
                      onChange={() => toggleExcluir('desatualizadas')}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Desatualizadas</span>
                  </label>
                </div>

                {/* Questões com */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-bold text-slate-700 dark:text-surface-200 mr-1 shrink-0">
                    Questões com
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-surface-300 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={com.gabaritoComentado}
                      onChange={() => toggleCom('gabaritoComentado')}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Gabarito Comentado</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-surface-300 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={com.comentarios}
                      onChange={() => toggleCom('comentarios')}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Comentários</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-surface-300 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={com.meusComentarios}
                      onChange={() => toggleCom('meusComentarios')}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Meus Comentários</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-surface-300 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={com.aulas}
                      onChange={() => toggleCom('aulas')}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Aulas</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-surface-300 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={com.minhasAnotacoes}
                      onChange={() => toggleCom('minhasAnotacoes')}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Minhas Anotações</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão de Alternância: Mostrar filtro simples / Mostrar mais filtros */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowMoreFilters((prev) => !prev)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <span>{showMoreFilters ? 'Mostrar filtro simples' : 'Mostrar mais filtros'}</span>
            {showMoreFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Barra Inferior: Filtrar por + Ações */}
        <div className="pt-3 border-t border-slate-200 dark:border-surface-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Tags Ativas */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-700 dark:text-surface-200 shrink-0">
              Filtrar por:
            </span>

            {activeFilterTags.length === 0 ? (
              <span className="text-xs text-slate-400 dark:text-surface-500 italic">
                Os seus filtros aparecerão aqui.
              </span>
            ) : (
              activeFilterTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200/80 dark:bg-surface-800 text-slate-700 dark:text-surface-200 border border-slate-300/80 dark:border-surface-700 shadow-2xs group"
                >
                  <span className="text-slate-500 dark:text-surface-400">{tag.label}:</span>
                  <span className="font-semibold truncate max-w-[160px]">{tag.value}</span>
                  <button
                    onClick={() => removeFilter(tag.id)}
                    aria-label={`Remover filtro ${tag.label}`}
                    className="p-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-surface-700 text-slate-400 hover:text-slate-700 dark:hover:text-surface-200 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
            {/* Salvar Filtros */}
            <button
              onClick={handleSalvar}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
            >
              <Bookmark size={15} />
              <span>Salvar Filtros</span>
            </button>

            {/* Limpar */}
            <button
              onClick={() => {
                resetAll();
                setLocalSearch('');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Limpar</span>
            </button>

            {/* Filtrar */}
            <button
              onClick={handleFiltrar}
              className="px-6 py-2 rounded-lg text-xs sm:text-sm font-bold text-white bg-[#ea7925] hover:bg-[#d86b1c] active:scale-98 transition-all shadow-md shadow-orange-600/20 cursor-pointer"
            >
              Filtrar
            </button>
          </div>
        </div>

        {/* Feedback de salvamento */}
        <AnimatePresence>
          {saveToast && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 pt-1"
            >
              <CheckCircle2 size={13} />
              <span>Filtros salvos com sucesso no seu navegador!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
