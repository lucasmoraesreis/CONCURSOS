/**
 * EditalVerticalizadoView.tsx — Edital Verticalizado Interativo com Importador Inteligente & Alimentador da Base
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ListChecks, CheckCircle2, Circle, BookOpen,
  Loader2, Play, Building2, Upload, Sparkles, X,
  Database, CheckCircle, Target
} from 'lucide-react';

import { fetchEditalVerticalizado, fetchFiltrosOpcoes, importEdital } from '../../api/client';
import { useFilterStore } from '../../stores/filterStore';
import type { EditalImportResponse } from '../../types';

interface EditalVerticalizadoViewProps {
  onStartPracticeTopic?: (assunto: string) => void;
}

export function EditalVerticalizadoView({ onStartPracticeTopic }: EditalVerticalizadoViewProps) {
  const queryClient = useQueryClient();
  const [selectedConcursoId, setSelectedConcursoId] = useState<string>('');
  const setSearch = useFilterStore((s) => s.setSearch);

  // Modal de importação
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [bancaNome, setBancaNome] = useState<string>('Fundação Getulio Vargas - FGV');
  const [orgao, setOrgao] = useState<string>('');
  const [cargo, setCargo] = useState<string>('');
  const [ano, setAno] = useState<number>(2026);
  const [nivel, setNivel] = useState<string>('Superior');
  const [conteudoTexto, setConteudoTexto] = useState<string>('');
  const [gerarIneditasQtd, setGerarIneditasQtd] = useState<number>(2);

  const [importSuccessResult, setImportSuccessResult] = useState<EditalImportResponse | null>(null);

  // Estado local de progresso persistido em localStorage
  const [progressState, setProgressState] = useState<Record<string, { teoria: boolean; revisado: boolean }>>(() => {
    try {
      const saved = localStorage.getItem('edital_verticalizado_progress');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('edital_verticalizado_progress', JSON.stringify(progressState));
    } catch {
      // ignore
    }
  }, [progressState]);

  // Lista de concursos
  const { data: filtrosOpcoes } = useQuery({
    queryKey: ['filtros-opcoes-edital'],
    queryFn: () => fetchFiltrosOpcoes(),
    staleTime: 5 * 60 * 1000,
  });

  // Query do Edital
  const { data, isLoading } = useQuery({
    queryKey: ['edital-verticalizado', selectedConcursoId],
    queryFn: () => fetchEditalVerticalizado(selectedConcursoId || undefined),
    staleTime: 60 * 1000,
  });

  // Mutation de Importação
  const importMutation = useMutation({
    mutationFn: importEdital,
    onSuccess: (res) => {
      setImportSuccessResult(res);
      setSelectedConcursoId(res.concurso_id);
      queryClient.invalidateQueries({ queryKey: ['edital-verticalizado'] });
      queryClient.invalidateQueries({ queryKey: ['filtros-opcoes-edital'] });
      queryClient.invalidateQueries({ queryKey: ['questoes'] });
      queryClient.invalidateQueries({ queryKey: ['study-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['study-coverage'] });
      setIsImportModalOpen(false);
      setConteudoTexto('');
    },
  });

  function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgao.trim() || !cargo.trim() || !conteudoTexto.trim()) return;

    importMutation.mutate({
      banca_nome: bancaNome,
      orgao: orgao.trim(),
      cargo: cargo.trim(),
      ano,
      nivel,
      conteudo_programatico_texto: conteudoTexto.trim(),
      gerar_ineditas_quantidade: gerarIneditasQtd,
    });
  }

  function toggleTeoria(topicoId: string) {
    setProgressState((prev) => ({
      ...prev,
      [topicoId]: {
        ...prev[topicoId],
        teoria: !prev[topicoId]?.teoria,
        revisado: prev[topicoId]?.revisado || false,
      },
    }));
  }

  function toggleRevisado(topicoId: string) {
    setProgressState((prev) => ({
      ...prev,
      [topicoId]: {
        teoria: prev[topicoId]?.teoria || false,
        revisado: !prev[topicoId]?.revisado,
      },
    }));
  }

  function handlePractice(assunto: string) {
    setSearch(assunto);
    if (onStartPracticeTopic) {
      onStartPracticeTopic(assunto);
    }
  }

  // Calcula progresso total
  let totalTopicos = 0;
  let concluidos = 0;

  if (data) {
    data.disciplinas.forEach((d) => {
      d.topicos.forEach((t) => {
        totalTopicos++;
        if (progressState[t.id]?.teoria && progressState[t.id]?.revisado) {
          concluidos += 1;
        } else if (progressState[t.id]?.teoria || progressState[t.id]?.revisado) {
          concluidos += 0.5;
        }
      });
    });
  }

  const overallPct = totalTopicos > 0 ? Math.round((concluidos / totalTopicos) * 100) : 0;
  const readinessPct = Math.min(100, Math.round(overallPct * 0.7 + 15));

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Banner Principal com Botão de Importar */}
      <div className="p-6 sm:p-8 rounded-3xl glass border border-teal-500/25 bg-gradient-to-r from-teal-950/30 via-surface-900/60 to-emerald-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-xs font-semibold text-teal-300 w-fit mb-2">
            <ListChecks size={13} className="text-teal-400" />
            Acompanhamento de Conteúdo Programático
          </span>
          <h2 className="text-2xl font-bold text-surface-100">
            Edital Verticalizado Interativo
          </h2>
          <p className="text-xs sm:text-sm text-surface-300 mt-1 max-w-xl">
            Importe o conteúdo programático de qualquer edital: a IA extrai a árvore de tópicos, vincula questões passadas e gera novas questões inéditas para alimentar a sua base de dados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Card Termômetro de Prontidão */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl glass border border-teal-500/30 bg-teal-950/20 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300">
              <Target size={20} />
            </div>
            <div>
              <div className="text-[10px] text-teal-300 uppercase font-bold tracking-wider">
                Prontidão
              </div>
              <div className="text-xl font-black text-surface-100">{readinessPct}%</div>
            </div>
          </div>

          {/* Botão de Importar Edital */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-90 text-white text-xs sm:text-sm font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer shrink-0"
          >
            <Upload size={16} />
            <span>Importar Novo Edital</span>
          </button>
        </div>
      </div>

      {/* Banner de Feedback de Importação Recente */}
      {importSuccessResult && (
        <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-start justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-emerald-200">
                {importSuccessResult.titulo} cadastrado e integrado com sucesso!
              </h4>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                Foram mapeadas <strong>{importSuccessResult.total_disciplinas} disciplinas</strong> e{' '}
                <strong>{importSuccessResult.total_topicos} tópicos</strong>.{' '}
                <span className="text-white font-semibold">
                  {importSuccessResult.total_questoes_vinculadas} questões de provas passadas
                </span>{' '}
                foram vinculadas e{' '}
                <span className="text-amber-300 font-semibold">
                  {importSuccessResult.total_questoes_geradas} novas questões inéditas
                </span>{' '}
                foram adicionadas permanentemente ao seu acervo!
              </p>
            </div>
          </div>
          <button
            onClick={() => setImportSuccessResult(null)}
            className="text-emerald-400 hover:text-white text-xs cursor-pointer p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Seletor de Concurso e Estatísticas */}
      <div className="p-5 rounded-2xl glass border border-surface-700/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="text-xs font-semibold text-surface-300 flex items-center gap-1.5 mb-2">
            <Building2 size={13} className="text-primary-400" />
            Selecione o Edital / Concurso Alvo:
          </label>
          <select
            value={selectedConcursoId}
            onChange={(e) => setSelectedConcursoId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl glass border border-surface-700/60 text-xs text-surface-100 bg-surface-900/90 focus:outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer"
          >
            <option value="">Edital Padrão (Concurso Geral)</option>
            {(filtrosOpcoes?.concursos || []).slice(0, 100).map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.orgao} — {c.cargo} ({c.ano})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-6 px-4 py-2 rounded-xl bg-surface-900/60 border border-surface-800 shrink-0">
          <div>
            <span className="text-[10px] text-surface-400 uppercase font-semibold">Progresso</span>
            <div className="text-lg font-black text-teal-400">{overallPct}%</div>
          </div>
          <div className="h-6 w-px bg-surface-700/50" />
          <div>
            <span className="text-[10px] text-surface-400 uppercase font-semibold">Tópicos</span>
            <div className="text-lg font-black text-surface-100">{totalTopicos}</div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 glass rounded-3xl border border-surface-700/40">
          <Loader2 size={36} className="animate-spin text-teal-400 mb-3" />
          <p className="text-xs text-surface-400">Estruturando árvore de tópicos do edital...</p>
        </div>
      )}

      {/* Árvore de Disciplinas e Tópicos */}
      {!isLoading && data && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-surface-400 px-1">
            <span className="font-bold text-surface-200">{data.titulo}</span>
            <span>{data.total_topicos} tópicos no conteúdo programático</span>
          </div>

          <div className="space-y-6">
            {data.disciplinas.map((disc) => (
              <div key={disc.id} className="rounded-3xl glass border border-surface-700/40 overflow-hidden">
                <div className="px-6 py-4 border-b border-surface-700/30 flex items-center justify-between bg-surface-900/50">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-teal-400" />
                    <h3 className="text-sm font-bold text-surface-100">
                      {disc.nome}
                    </h3>
                  </div>
                  <span className="text-xs text-surface-400">
                    {disc.topicos.length} tópicos
                  </span>
                </div>

                <div className="divide-y divide-surface-700/30">
                  {disc.topicos.map((top) => {
                    const status = progressState[top.id] || { teoria: false, revisado: false };
                    return (
                      <div
                        key={top.id}
                        className="p-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-surface-800/20 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-xs font-semibold text-surface-200 truncate">
                            {top.nome}
                          </span>
                          <span className="text-[11px] text-surface-500 font-mono shrink-0">
                            ({top.questoes_disponiveis} q)
                          </span>
                        </div>

                        {/* Checkboxes de Controle */}
                        <div className="flex items-center gap-4 text-xs shrink-0">
                          {/* Teoria */}
                          <button
                            onClick={() => toggleTeoria(top.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                              status.teoria
                                ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                                : 'glass border-surface-700/50 text-surface-400 hover:text-surface-200'
                            }`}
                          >
                            {status.teoria ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                            <span>Teoria Lida</span>
                          </button>

                          {/* Revisado */}
                          <button
                            onClick={() => toggleRevisado(top.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                              status.revisado
                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                : 'glass border-surface-700/50 text-surface-400 hover:text-surface-200'
                            }`}
                          >
                            {status.revisado ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                            <span>Revisado</span>
                          </button>

                          {/* Resolver Questões */}
                          <button
                            onClick={() => handlePractice(top.nome)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600/30 hover:bg-primary-600/50 border border-primary-500/40 text-primary-200 font-semibold transition-all cursor-pointer"
                          >
                            <Play size={12} />
                            <span>Praticar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: IMPORTAÇÃO INTELIGENTE DE EDITAL                  */}
      {/* ======================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-surface-900 border border-surface-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-surface-100">
                    Importar Conteúdo do Edital & Alimentar Base
                  </h3>
                  <p className="text-xs text-surface-400">
                    Extração automática de disciplinas, tópicos, vinculação de questões e geração de inéditas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 rounded-xl bg-surface-800 text-surface-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1">
                    Banca Examinadora:
                  </label>
                  <input
                    type="text"
                    value={bancaNome}
                    onChange={(e) => setBancaNome(e.target.value)}
                    required
                    placeholder="Ex: FGV, Cebraspe, FCC, Vunesp, Cesgranrio"
                    className="w-full px-3.5 py-2.5 rounded-xl glass border border-surface-700 text-xs text-surface-100 bg-surface-950 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1">
                    Órgão / Instituição:
                  </label>
                  <input
                    type="text"
                    value={orgao}
                    onChange={(e) => setOrgao(e.target.value)}
                    required
                    placeholder="Ex: Tribunal de Justiça de SP, Receita Federal"
                    className="w-full px-3.5 py-2.5 rounded-xl glass border border-surface-700 text-xs text-surface-100 bg-surface-950 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1">
                    Cargo:
                  </label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    required
                    placeholder="Ex: Analista Judiciário"
                    className="w-full px-3.5 py-2.5 rounded-xl glass border border-surface-700 text-xs text-surface-100 bg-surface-950 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1">
                    Ano:
                  </label>
                  <input
                    type="number"
                    value={ano}
                    onChange={(e) => setAno(Number(e.target.value))}
                    min={2000}
                    max={2030}
                    className="w-full px-3.5 py-2.5 rounded-xl glass border border-surface-700 text-xs text-surface-100 bg-surface-950 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1">
                    Nível de Escolaridade:
                  </label>
                  <select
                    value={nivel}
                    onChange={(e) => setNivel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass border border-surface-700 text-xs text-surface-100 bg-surface-950 focus:outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer"
                  >
                    <option value="Superior">Superior</option>
                    <option value="Médio">Médio</option>
                    <option value="Fundamental">Fundamental</option>
                  </select>
                </div>
              </div>

              {/* Textarea do Conteúdo Programático */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-surface-300">
                    Conteúdo Programático do Edital (Cole o texto aqui):
                  </label>
                  <span className="text-[10px] text-surface-500">
                    Aceita cópia de PDF oficial com títulos e itens
                  </span>
                </div>
                <textarea
                  value={conteudoTexto}
                  onChange={(e) => setConteudoTexto(e.target.value)}
                  rows={8}
                  required
                  placeholder={`Cole aqui o trecho do edital referente às matérias. Exemplo:

LÍNGUA PORTUGUESA:
1. Compreensão e interpretação de textos.
2. Ortografia oficial e acentuação gráfica.
3. Emprego do sinal indicativo de crase.

DIREITO CONSTITUCIONAL:
1. Direitos e garantias fundamentais.
2. Organização dos poderes: Poder Judiciário.`}
                  className="w-full p-3 rounded-xl glass border border-surface-700 text-xs text-surface-100 bg-surface-950 focus:outline-none focus:ring-2 focus:ring-teal-500/40 font-mono leading-relaxed"
                />
              </div>

              {/* Opção de Geração de Inéditas */}
              <div className="p-3.5 rounded-2xl bg-surface-950 border border-surface-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Database size={16} className="text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-surface-200">
                      Alimentar Base com Questões Inéditas da Banca
                    </div>
                    <div className="text-[11px] text-surface-400">
                      Cria automaticamente questões nos moldes exatos da banca e salva no acervo permanente
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {[0, 2, 3, 5].map((qtd) => (
                    <button
                      key={qtd}
                      type="button"
                      onClick={() => setGerarIneditasQtd(qtd)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        gerarIneditasQtd === qtd
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                          : 'glass border border-surface-700 text-surface-400 hover:text-surface-200'
                      }`}
                    >
                      {qtd === 0 ? 'Não' : `+${qtd} / matéria`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões do Form */}
              <div className="border-t border-surface-800 pt-4 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl glass border border-surface-700 text-xs font-semibold text-surface-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Processando e Alimentando Banco...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>Processar Edital & Salvar na Base</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
