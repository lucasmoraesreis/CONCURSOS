/**
 * GeneratedQuestionsPage — Página dedicada de questões geradas pela IA
 *
 * Exibe as questões geradas em tempo real com scroll infinito.
 * O usuário pode gerar mais 5 questões clicando no botão no final da página.
 */

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Loader2, Wand2, Zap, AlertTriangle,
  BookOpen, Target, Shield, RefreshCw,
} from 'lucide-react';
import { useGeneratorStore } from '../../stores/generatorStore';
import { gerarLoteIneditas } from '../../api/client';
import { QuestionCard } from '../QuestionCard/QuestionCard';

const BATCH_SIZE = 5;

const STEP_MESSAGES = [
  'Mapeando matriz de pegadinhas da banca...',
  'Engenhando distratores cognitivos com IA...',
  'Calibrando nível de dificuldade...',
  'Calculando vetores de embedding...',
  'Finalizando questões inéditas...',
];

export function GeneratedQuestionsPage() {
  const {
    config,
    questoes,
    isGenerating,
    generationStep,
    error,
    totalGenerated,
    goBack,
    setIsGenerating,
    setGenerationStep,
    setError,
    addQuestoes,
  } = useGeneratorStore();

  const newQuestionsRef = useRef<HTMLDivElement>(null);
  const hasInitialGeneration = useRef(false);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Gera um lote de questões
  const generateBatch = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGenerationStep(STEP_MESSAGES[0]);

    // Animação rotativa dos steps
    let stepIdx = 0;
    stepIntervalRef.current = setInterval(() => {
      stepIdx = (stepIdx + 1) % STEP_MESSAGES.length;
      setGenerationStep(STEP_MESSAGES[stepIdx]);
    }, 2200);

    try {
      const novasQuestoes = await gerarLoteIneditas(
        {
          banca: config.banca,
          disciplina: config.disciplina,
          assunto: config.assunto,
          tipo_questao: config.tipoQuestao,
          dificuldade: config.dificuldade,
          provider: config.provider,
        },
        BATCH_SIZE,
        totalGenerated + 1
      );

      if (novasQuestoes.length === 0) {
        setError('Nenhuma questão foi gerada com sucesso. Tente novamente ou mude o provedor de IA.');
      } else {
        addQuestoes(novasQuestoes);

        // Scroll suave para as novas questões após renderizar
        setTimeout(() => {
          newQuestionsRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 300);
      }
    } catch (err: any) {
      console.error('Erro na geração em lote:', err);
      const detail =
        err?.response?.data?.detail ||
        (err?.code === 'ERR_NETWORK'
          ? 'Não foi possível conectar ao backend na porta 8000. Verifique se o servidor está ativo.'
          : null) ||
        err?.message ||
        'Erro ao processar a geração das questões.';
      setError(detail);
    } finally {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
        stepIntervalRef.current = null;
      }
      setIsGenerating(false);
      setGenerationStep('');
    }
  }, [
    isGenerating,
    config,
    totalGenerated,
    setIsGenerating,
    setError,
    setGenerationStep,
    addQuestoes,
  ]);

  // Gerar automaticamente ao entrar na página (apenas uma vez)
  useEffect(() => {
    if (!hasInitialGeneration.current) {
      hasInitialGeneration.current = true;
      generateBatch();
    }

    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      {/* Header fixo */}
      <header className="sticky top-0 z-40 glass border-b border-surface-700/30 bg-surface-950/80 backdrop-blur-xl">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-3 py-2 rounded-xl glass text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 transition-all text-sm font-medium"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Voltar</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-600/20">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-surface-100 leading-tight">
                  Questões Geradas por IA
                </h1>
                <p className="text-xs text-surface-400">
                  Hacker de Bancas — Geração infinita de inéditas
                </p>
              </div>
            </div>
          </div>

          {/* Contador */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border border-purple-500/30">
              <span className="text-sm font-bold text-purple-300">
                {totalGenerated}
              </span>
              <span className="text-xs text-surface-400 ml-1.5">
                questão{totalGenerated !== 1 ? 'ões' : ''} gerada{totalGenerated !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Config summary banner */}
      <div className="max-w-screen-xl mx-auto px-6 pt-6">
        <div className="p-4 rounded-2xl glass border border-surface-700/50 bg-gradient-to-r from-purple-950/20 via-surface-900/60 to-indigo-950/20">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Shield size={14} className="text-purple-400" />
              <span className="font-semibold text-surface-200">Configuração:</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-xs font-medium text-purple-300">
              {config.banca}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-700/60 text-xs font-medium text-surface-300 flex items-center gap-1.5">
              <BookOpen size={12} />
              {config.disciplina}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-700/60 text-xs font-medium text-surface-300 flex items-center gap-1.5">
              <Target size={12} />
              {config.assunto}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/20 text-xs font-medium text-amber-300">
              {config.dificuldade}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-700/60 text-xs font-medium text-surface-300">
              {config.tipoQuestao}
            </span>
          </div>
        </div>
      </div>

      {/* Questões */}
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="space-y-5">
          <AnimatePresence>
            {questoes.map((q, i) => (
              <QuestionCard key={q.id} questao={q} index={i} />
            ))}
          </AnimatePresence>

          {/* Marcador para scroll automático */}
          <div ref={newQuestionsRef} />

          {/* Loading Skeletons durante geração */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Status de geração */}
              <div className="p-6 rounded-2xl glass border border-purple-500/30 bg-gradient-to-r from-purple-950/20 to-indigo-950/20">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <Loader2 size={24} className="text-white animate-spin" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 animate-pulse border-2 border-surface-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-100">
                      Gerando {BATCH_SIZE} questões inéditas...
                    </h3>
                    <p className="text-xs text-purple-300 mt-0.5 flex items-center gap-1.5">
                      <Zap size={12} className="text-purple-400" />
                      {generationStep || 'Processando...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Skeletons das questões */}
              {[...Array(BATCH_SIZE)].map((_, i) => (
                <div key={`skel-${i}`} className="rounded-2xl glass p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-9 h-9 rounded-xl" />
                    <div className="skeleton h-5 w-40" />
                    <div className="skeleton h-5 w-24" />
                  </div>
                  <div className="skeleton h-4 w-full mt-4" />
                  <div className="skeleton h-4 w-5/6" />
                  <div className="skeleton h-4 w-4/6" />
                  <div className="space-y-2 mt-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="skeleton h-12 w-full rounded-xl" />
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Erro */}
          {error && !isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
            >
              <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">{error}</p>
                <button
                  onClick={generateBatch}
                  className="mt-3 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-medium transition-all flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  Tentar novamente
                </button>
              </div>
            </motion.div>
          )}

          {/* Botão de gerar mais — aparece quando não está carregando e há questões */}
          {!isGenerating && questoes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="pt-6 pb-12"
            >
              <div className="relative">
                {/* Linha decorativa */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

                <div className="relative flex justify-center">
                  <button
                    onClick={generateBatch}
                    className="group px-8 py-5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-primary-600 
                              text-white font-bold text-base shadow-2xl shadow-purple-600/30 
                              hover:shadow-purple-600/50 hover:scale-[1.02] active:scale-[0.98]
                              transition-all duration-300 flex items-center gap-3 cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors">
                      <Wand2 size={22} />
                    </div>
                    <div className="text-left">
                      <span className="block text-base font-bold">
                        Gerar Mais {BATCH_SIZE} Questões
                      </span>
                      <span className="block text-xs text-purple-200/80 font-normal">
                        As questões são geradas na hora pela IA
                      </span>
                    </div>
                    <Sparkles size={20} className="text-purple-200 group-hover:animate-pulse ml-2" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
