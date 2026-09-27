/**
 * SmartSimuladoView.tsx — Simulados Inteligentes Multi-Banca
 *
 * Recursos:
 * - Presets para FGV, FCC, Vunesp, Cesgranrio, Cebraspe/Quadrix e Geral
 * - Cartão-Resposta Oficial interativo em tempo real (grade de bolinhas A-E ou C/E)
 * - Marcação de "Dúvida / Revisar Antes de Entregar"
 * - Temporizador com contagem regressiva e alertas visuais de tempo
 * - Exportação de Caderno de Prova em PDF Oficial (2 colunas) via PrintableExamModal
 * - Diagnóstico completo pós-prova por disciplina e comparativo de nota líquida
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, Clock, ArrowRight, ArrowLeft,
  RotateCcw, Loader2, Play, Trophy, BarChart3, Printer, CircleSlash,
  ListChecks, Bookmark, X
} from 'lucide-react';

import { fetchSmartSimulado, answerQuestion, fetchFiltrosOpcoes } from '../../api/client';
import type { Questao } from '../../types';
import { PrintableExamModal } from './PrintableExamModal';

interface SmartSimuladoViewProps {
  onBackToHub?: () => void;
}

type SimuladoState = 'config' | 'running' | 'completed';
type SimuladoMode =
  | 'geral'
  | 'fgv'
  | 'fcc'
  | 'vunesp'
  | 'cesgranrio'
  | 'cebraspe'
  | 'erros'
  | 'revisao'
  | 'favoritas';

export function SmartSimuladoView({ onBackToHub }: SmartSimuladoViewProps) {
  const queryClient = useQueryClient();
  const [simuladoState, setSimuladoState] = useState<SimuladoState>('config');

  // Configurações
  const [modo, setModo] = useState<SimuladoMode>('geral');
  const [quantidade, setQuantidade] = useState<number>(15);
  const [selectedConcursoId, setSelectedConcursoId] = useState<string>('');
  const [tempoLimiteMinutos, setTempoLimiteMinutos] = useState<number>(45); // 0 = livre

  // Execução
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  // Modais
  const [isAnswerSheetOpen, setIsAnswerSheetOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Lista de concursos
  const { data: filtrosOpcoes } = useQuery({
    queryKey: ['filtros-opcoes-simulado'],
    queryFn: () => fetchFiltrosOpcoes(),
    staleTime: 5 * 60 * 1000,
  });

  // Mapeia modo para backendModo
  const backendModo =
    modo === 'erros' || modo === 'revisao' || modo === 'favoritas'
      ? modo
      : 'geral';

  const {
    data: simuladoData,
    isLoading: isSimuladoLoading,
    refetch: fetchSimulado,
  } = useQuery({
    queryKey: ['smart-simulado', backendModo, quantidade, selectedConcursoId],
    queryFn: () =>
      fetchSmartSimulado({
        modo: backendModo,
        quantidade,
        concurso_id: selectedConcursoId || undefined,
      }),
    enabled: false,
  });

  const answerMutation = useMutation({
    mutationFn: answerQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['study-gamification'] });
      queryClient.invalidateQueries({ queryKey: ['study-errors'] });
      queryClient.invalidateQueries({ queryKey: ['study-streak'] });
    },
  });

  // Controle do cronômetro
  useEffect(() => {
    if (simuladoState === 'running') {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [simuladoState]);

  async function handleStartSimulado() {
    setUserAnswers({});
    setFlaggedQuestions({});
    setCurrentIndex(0);
    setElapsedSeconds(0);
    const result = await fetchSimulado();
    if (result.data && result.data.items.length > 0) {
      setSimuladoState('running');
    }
  }

  function handleSelectOption(questaoId: string, letra: string) {
    setUserAnswers((prev) => ({ ...prev, [questaoId]: letra }));
    if (letra !== 'BRANCO') {
      answerMutation.mutate({
        questao_id: questaoId,
        alternativa: letra,
        tempo_segundos: 0,
      });
    }
  }

  function toggleFlag(questaoId: string) {
    setFlaggedQuestions((prev) => ({ ...prev, [questaoId]: !prev[questaoId] }));
  }

  function handleFinishSimulado() {
    setIsAnswerSheetOpen(false);
    setSimuladoState('completed');
  }

  function formatTimerDisplay() {
    if (tempoLimiteMinutos === 0) {
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    const remaining = Math.max(0, tempoLimiteMinutos * 60 - elapsedSeconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  const items = simuladoData?.items || [];
  const currentQuestion: Questao | undefined = items[currentIndex];

  // Cálculo de tempo restante
  const remainingSeconds = tempoLimiteMinutos > 0 ? Math.max(0, tempoLimiteMinutos * 60 - elapsedSeconds) : 9999;
  const isTimeCritical = tempoLimiteMinutos > 0 && remainingSeconds <= 300; // < 5 min
  const isTimeWarning = tempoLimiteMinutos > 0 && remainingSeconds <= 900 && !isTimeCritical; // < 15 min

  // Identifica se a questão atual ou a prova é do estilo Cebraspe/Certo/Errado
  const isCebraspeStyle =
    modo === 'cebraspe' ||
    Boolean(currentQuestion?.tipo_questao?.toLowerCase().includes('certo')) ||
    (currentQuestion?.alternativas?.length === 2);

  // Métricas do diagnóstico final
  const totalQuestions = items.length;
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  const subjectBreakdown: Record<string, { total: number; correct: number }> = {};

  if (simuladoState === 'completed') {
    items.forEach((q) => {
      const selected = userAnswers[q.id];
      if (selected === 'BRANCO' || !selected) {
        blankCount++;
      } else if (selected.toUpperCase() === (q.alternativa_correta || '').toUpperCase()) {
        correctCount++;
      } else {
        wrongCount++;
      }

      const subj = q.disciplina_nome || 'Geral';
      if (!subjectBreakdown[subj]) {
        subjectBreakdown[subj] = { total: 0, correct: 0 };
      }
      subjectBreakdown[subj].total++;
      if (selected && selected !== 'BRANCO' && selected.toUpperCase() === (q.alternativa_correta || '').toUpperCase()) {
        subjectBreakdown[subj].correct++;
      }
    });
  }

  const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const notaLiquidaCebraspe = Math.max(0, correctCount - wrongCount);

  // Nome da banca para cabeçalho
  const bancaHeader =
    modo === 'fgv'
      ? 'Fundação Getulio Vargas (FGV)'
      : modo === 'fcc'
        ? 'Fundação Carlos Chagas (FCC)'
        : modo === 'vunesp'
          ? 'Fundação VUNESP'
          : modo === 'cesgranrio'
            ? 'Fundação Cesgranrio'
            : modo === 'cebraspe'
              ? 'Cebraspe / UnB'
              : currentQuestion?.banca_nome || 'Banca Examinadora Oficial';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Modal de Impressão de Prova / Exportação em PDF */}
      <PrintableExamModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        questoes={items}
        tituloSimulado={`Simulado Multi-Banca — ${bancaHeader}`}
        bancaNome={bancaHeader}
        orgaoNome={currentQuestion?.concurso_orgao || 'Concurso Público Oficial'}
        cargoNome={currentQuestion?.concurso_cargo || 'Cargo Específico'}
      />

      {/* ======================================================== */}
      {/* ESTADO 1: CONFIGURAÇÃO DO SIMULADO                      */}
      {/* ======================================================== */}
      {simuladoState === 'config' && (
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl glass border border-primary-500/25 bg-gradient-to-br from-primary-950/30 via-surface-900/60 to-purple-950/30 shadow-2xl space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-primary-600/30 text-white">
              <Award size={32} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-surface-100">
              Simulado Multi-Banca Profissional
            </h2>
            <p className="text-xs sm:text-sm text-surface-300 max-w-xl mx-auto">
              Simule as condições reais do dia da prova: escolha a banca examinadora, acompanhe seu tempo no cronômetro regressivo e utilize o Cartão-Resposta Oficial.
            </p>
          </div>

          <div className="space-y-6">
            {/* Presets por Banca / Estilo de Prova */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-surface-300">
                Selecione o Estilo da Prova / Banca Examinadora:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: 'geral', label: 'Simulado Geral', badge: 'Multi-Banca', desc: 'Questões balanceadas de todo o acervo' },
                  { id: 'fgv', label: 'Padrão FGV', badge: 'A-E', desc: 'Estudos de caso práticos e interpretação densa' },
                  { id: 'fcc', label: 'Padrão FCC', badge: 'A-E', desc: 'Doutrina majoritária e técnica legislativa' },
                  { id: 'vunesp', label: 'Padrão VUNESP', badge: 'A-E', desc: 'Literalidade estrita da lei seca e jurisprudência' },
                  { id: 'cesgranrio', label: 'Padrão Cesgranrio', badge: 'A-E', desc: 'Estilo CNU, Caixa Econômica e Banco do Brasil' },
                  { id: 'cebraspe', label: 'Regra Cebraspe / Quadrix', badge: 'Líquida', desc: '1 errada anula 1 certa + Deixar em Branco' },
                  { id: 'erros', label: 'Caderno de Erros', badge: 'Revisão', desc: 'Refaça apenas as questões que você já errou' },
                  { id: 'revisao', label: 'Revisão Espaçada', badge: 'Timing', desc: 'Questões com data de repetição vencida hoje' },
                  { id: 'favoritas', label: 'Questões Favoritas', badge: 'Salvas', desc: 'Pratique seu acervo pessoal de questões marcadas' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModo(m.id as SimuladoMode)}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      modo === m.id
                        ? 'bg-primary-500/20 border-primary-500 text-surface-100 shadow-md shadow-primary-500/10'
                        : 'glass border-surface-700/50 text-surface-400 hover:text-surface-200 hover:border-surface-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold text-surface-100">{m.label}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-800 text-primary-300 border border-surface-700">
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-surface-400 mt-1 leading-relaxed">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Concurso Alvo Opcional */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-surface-300">
                Filtrar por Concurso / Órgão Específico (Opcional):
              </label>
              <select
                value={selectedConcursoId}
                onChange={(e) => setSelectedConcursoId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass border border-surface-700/60 text-xs text-surface-100 bg-surface-900/90 focus:outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer"
              >
                <option value="">Qualquer concurso da base</option>
                {(filtrosOpcoes?.concursos || []).slice(0, 100).map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.orgao} — {c.cargo} ({c.ano})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantidade e Tempo de Prova */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quantidade */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-surface-300">
                  Quantidade de Questões:
                </label>
                <div className="flex gap-2">
                  {[10, 15, 20, 30, 50].map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuantidade(q)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        quantidade === q
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                          : 'glass border border-surface-700/50 text-surface-400 hover:text-surface-200'
                      }`}
                    >
                      {q}q
                    </button>
                  ))}
                </div>
              </div>

              {/* Tempo Limite */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-surface-300">
                  Tempo Limite de Prova:
                </label>
                <div className="flex gap-2">
                  {[
                    { val: 0, label: 'Livre' },
                    { val: 30, label: '30m' },
                    { val: 45, label: '45m' },
                    { val: 90, label: '1h30' },
                    { val: 180, label: '3h' },
                  ].map((t) => (
                    <button
                      key={t.val}
                      onClick={() => setTempoLimiteMinutos(t.val)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        tempoLimiteMinutos === t.val
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                          : 'glass border border-surface-700/50 text-surface-400 hover:text-surface-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartSimulado}
            disabled={isSimuladoLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 hover:opacity-95 text-white font-bold text-base shadow-xl shadow-primary-600/30 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            {isSimuladoLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Carregando simulado multi-banca...</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>Iniciar Simulado Oficial</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* ESTADO 2: EXECUÇÃO DO SIMULADO                           */}
      {/* ======================================================== */}
      {simuladoState === 'running' && currentQuestion && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Barra Superior do Simulado */}
          <div className="p-4 sm:p-5 rounded-2xl glass border border-surface-700/50 flex flex-wrap items-center justify-between gap-4 sticky top-20 z-30 bg-surface-950/90 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                Questão {currentIndex + 1} de {items.length}
              </span>
              <div className="h-4 w-px bg-surface-700/50" />
              {/* Temporizador */}
              <div
                className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  isTimeCritical
                    ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
                    : isTimeWarning
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-primary-500/15 border-primary-500/30 text-primary-300'
                }`}
              >
                <Clock size={14} />
                <span className="font-mono text-sm">{formatTimerDisplay()}</span>
                {tempoLimiteMinutos > 0 && <span className="text-[10px] opacity-70">restantes</span>}
              </div>
            </div>

            {/* Ações da Barra Superior */}
            <div className="flex items-center gap-2">
              {/* Botão do Cartão-Resposta */}
              <button
                onClick={() => setIsAnswerSheetOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-primary-500/40 bg-primary-500/10 text-primary-300 text-xs font-bold hover:bg-primary-500/20 transition-all cursor-pointer"
                title="Abrir Cartão-Resposta Oficial"
              >
                <ListChecks size={15} />
                <span>
                  Cartão ({Object.keys(userAnswers).length}/{items.length})
                </span>
              </button>

              {/* Botão de Impressão */}
              <button
                onClick={() => setIsPrintModalOpen(true)}
                title="Imprimir caderno em PDF"
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl glass border border-surface-700/50 text-surface-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">PDF</span>
              </button>

              {/* Botão de Finalizar */}
              <button
                onClick={handleFinishSimulado}
                className="px-4 py-2 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-200 text-xs font-bold transition-all cursor-pointer"
              >
                Finalizar
              </button>
            </div>
          </div>

          {/* Card da Questão Atual */}
          <div className="p-6 sm:p-8 rounded-3xl glass border border-surface-700/50 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-700/30 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-primary-500/20 text-primary-300 text-xs font-semibold">
                  {currentQuestion.disciplina_nome || 'Disciplina Geral'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-surface-800 text-surface-300 text-xs font-medium border border-surface-700/60">
                  {currentQuestion.banca_nome || bancaHeader}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-surface-800 text-surface-400 text-xs">
                  {currentQuestion.tipo_questao}
                </span>
              </div>

              {/* Botão de Marcar Dúvida */}
              <button
                onClick={() => toggleFlag(currentQuestion.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  flaggedQuestions[currentQuestion.id]
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'glass border-surface-700/50 text-surface-400 hover:text-surface-200'
                }`}
              >
                <Bookmark
                  size={13}
                  className={flaggedQuestions[currentQuestion.id] ? 'fill-amber-400 text-amber-400' : ''}
                />
                <span>
                  {flaggedQuestions[currentQuestion.id] ? 'Marcada para Revisão' : 'Marcar Dúvida'}
                </span>
              </button>
            </div>

            {/* Enunciado */}
            <p className="text-sm sm:text-base leading-relaxed text-surface-100 whitespace-pre-wrap font-sans">
              {currentQuestion.enunciado}
            </p>

            {/* Alternativas */}
            <div className="space-y-3 pt-2">
              {currentQuestion.alternativas.map((alt) => {
                const isSelected = userAnswers[currentQuestion.id] === alt.letra;
                return (
                  <button
                    key={alt.letra}
                    onClick={() => handleSelectOption(currentQuestion.id, alt.letra)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-primary-500/20 border-primary-500 text-surface-100 shadow-md shadow-primary-500/10'
                        : 'glass border-surface-700/40 text-surface-300 hover:border-surface-600 hover:bg-surface-800/30'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-400'
                      }`}
                    >
                      {alt.letra}
                    </span>
                    <span className="text-sm pt-0.5 leading-relaxed">{alt.texto}</span>
                  </button>
                );
              })}
            </div>

            {/* Deixar em Branco (Cebraspe) */}
            {isCebraspeStyle && (
              <div className="pt-2">
                <button
                  onClick={() => handleSelectOption(currentQuestion.id, 'BRANCO')}
                  className={`w-full py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    userAnswers[currentQuestion.id] === 'BRANCO'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'glass border-surface-700/50 text-surface-400 hover:text-amber-300 hover:bg-surface-800/40'
                  }`}
                >
                  <CircleSlash size={14} />
                  <span>Deixar em Branco (Estratégia Cebraspe: 0 pontos, sem anulação)</span>
                </button>
              </div>
            )}

            {/* Navegação Entre Questões */}
            <div className="flex items-center justify-between pt-4 border-t border-surface-700/30">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-surface-700/50 text-xs font-semibold text-surface-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Anterior</span>
              </button>

              <div className="text-xs text-surface-400 font-medium">
                {Object.keys(userAnswers).length} de {items.length} respondidas
              </div>

              {currentIndex < items.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1))}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-all shadow-md shadow-primary-600/20 cursor-pointer"
                >
                  <span>Próxima</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleFinishSimulado}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Trophy size={14} />
                  <span>Concluir Simulado</span>
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* DRAWER / MODAL: CARTÃO-RESPOSTA OFICIAL INTERATIVO       */}
          {/* ======================================================== */}
          {isAnswerSheetOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
              <div className="relative w-full max-w-2xl bg-surface-900 border border-surface-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-surface-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-primary-500/20 text-primary-400">
                      <ListChecks size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-surface-100">
                        Cartão-Resposta Oficial Interativo
                      </h3>
                      <p className="text-xs text-surface-400">
                        {Object.keys(userAnswers).length} de {items.length} respondidas •{' '}
                        {Object.values(flaggedQuestions).filter(Boolean).length} com dúvida
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAnswerSheetOpen(false)}
                    className="p-2 rounded-xl bg-surface-800 text-surface-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Grid de Preenchimento do Cartão-Resposta */}
                <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                  {items.map((q, idx) => {
                    const ans = userAnswers[q.id];
                    const isFlagged = flaggedQuestions[q.id];
                    const isCurrent = idx === currentIndex;
                    const options = q.tipo_questao?.toLowerCase().includes('certo') || q.alternativas.length === 2
                      ? ['C', 'E']
                      : ['A', 'B', 'C', 'D', 'E'];

                    return (
                      <div
                        key={q.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-primary-950/40 border-primary-500/50'
                            : 'bg-surface-950/40 border-surface-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCurrentIndex(idx);
                              setIsAnswerSheetOpen(false);
                            }}
                            className="font-bold text-xs text-surface-200 hover:text-primary-300 transition-colors cursor-pointer"
                          >
                            Questão {String(idx + 1).padStart(2, '0')}
                          </button>
                          {isFlagged && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Bookmark size={10} className="fill-amber-400" />
                              Dúvida
                            </span>
                          )}
                        </div>

                        {/* Bolinhas de Resposta */}
                        <div className="flex items-center gap-1.5">
                          {options.map((letra) => {
                            const isSelected = ans === letra;
                            return (
                              <button
                                key={letra}
                                onClick={() => handleSelectOption(q.id, letra)}
                                className={`w-8 h-8 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-primary-500 border-primary-400 text-white shadow-md shadow-primary-500/30'
                                    : 'border-surface-700 bg-surface-800/80 text-surface-400 hover:border-surface-500 hover:text-surface-200'
                                }`}
                              >
                                {letra}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-surface-800 pt-4 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setIsAnswerSheetOpen(false)}
                    className="px-5 py-2.5 rounded-xl glass border border-surface-700 text-xs font-semibold text-surface-300 hover:text-white cursor-pointer"
                  >
                    Voltar à Prova
                  </button>
                  <button
                    onClick={handleFinishSimulado}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    Entregar Prova e Ver Resultado
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ESTADO 3: DIAGNÓSTICO E RESULTADO FINAL                  */}
      {/* ======================================================== */}
      {simuladoState === 'completed' && (
        <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
          {/* Card de Resultado Geral */}
          <div className="p-8 rounded-3xl glass border border-primary-500/25 bg-gradient-to-br from-primary-950/40 via-surface-900/60 to-purple-950/30 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-primary-600/30 text-white">
              <Trophy size={40} />
            </div>

            <div>
              <span className="text-xs font-bold text-primary-300 uppercase tracking-widest">
                Simulado Concluído • {bancaHeader}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-surface-100 mt-1">
                {modo === 'cebraspe' ? (
                  <>Nota Líquida: {notaLiquidaCebraspe} pts</>
                ) : (
                  <>Aproveitamento: {scorePct}%</>
                )}
              </h2>
              <p className="text-sm text-surface-300 mt-2">
                {modo === 'cebraspe'
                  ? `Você obteve ${notaLiquidaCebraspe} pontos líquidos (${correctCount} certas menos ${wrongCount} erradas). ${blankCount} questões deixadas em branco.`
                  : scorePct >= 80
                    ? '🔥 Desempenho excelente! Você está no nível de aprovação para esta banca.'
                    : scorePct >= 60
                      ? '👍 Bom aproveitamento! Corrija os pontos fracos apontados abaixo para alcançar o topo.'
                      : '⚠️ Rendimento abaixo do corte. Revise as disciplinas deficitárias antes da prova oficial.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl glass border border-surface-700/40">
                <span className="text-xs text-surface-400">Total de Questões</span>
                <div className="text-xl font-black text-surface-100 mt-1">{totalQuestions}</div>
              </div>
              <div className="p-4 rounded-2xl glass border border-emerald-500/30 bg-emerald-950/10">
                <span className="text-xs text-emerald-400">Acertos (+1)</span>
                <div className="text-xl font-black text-emerald-300 mt-1">{correctCount}</div>
              </div>
              <div className="p-4 rounded-2xl glass border border-red-500/30 bg-red-950/10">
                <span className="text-xs text-red-400">Erros</span>
                <div className="text-xl font-black text-red-300 mt-1">{wrongCount}</div>
              </div>
              <div className="p-4 rounded-2xl glass border border-amber-500/30 bg-amber-950/10">
                <span className="text-xs text-amber-400">Em Branco (0)</span>
                <div className="text-xl font-black text-amber-300 mt-1">{blankCount}</div>
              </div>
            </div>
          </div>

          {/* Diagnóstico por Disciplina */}
          <div className="p-6 sm:p-8 rounded-3xl glass border border-surface-700/40 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={18} className="text-primary-400" />
              <h3 className="text-base font-bold text-surface-100">
                Diagnóstico de Rendimento por Disciplina
              </h3>
            </div>

            <div className="space-y-3">
              {Object.entries(subjectBreakdown).map(([subj, stats]) => {
                const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                return (
                  <div key={subj} className="p-4 rounded-2xl bg-surface-900/40 border border-surface-700/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-surface-200">{subj}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-surface-400">
                          {stats.correct}/{stats.total} acertos
                        </span>
                        <span
                          className={`font-bold ${
                            pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ações pós-simulado */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setSimuladoState('config')}
              className="flex-1 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-primary-600/30 cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              <span>Novo Simulado</span>
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="py-3.5 px-6 rounded-2xl glass border border-surface-700/60 text-surface-300 hover:text-surface-100 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Printer size={16} />
              <span>Caderno em PDF</span>
            </button>
            {onBackToHub && (
              <button
                onClick={onBackToHub}
                className="py-3.5 px-6 rounded-2xl glass border border-surface-700/60 text-surface-300 hover:text-surface-100 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                Voltar às Questões
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
