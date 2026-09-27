/**
 * FlashcardsView.tsx — Flashcards Inteligentes (Algoritmo SM-2 de Repetição Espaçada)
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, RotateCcw, Sparkles, Loader2,
  ChevronRight, Trophy
} from 'lucide-react';
import { fetchFlashcards, reviewFlashcard } from '../../api/client';
import type { Flashcard } from '../../types';

export function FlashcardsView() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['flashcards-list'],
    queryFn: () => fetchFlashcards(30),
    staleTime: 60 * 1000,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: number }) =>
      reviewFlashcard(cardId, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['study-reviews'] });
    },
  });

  const items: Flashcard[] = data?.items || [];
  const currentCard: Flashcard | undefined = items[currentIndex];
  const isFinished = items.length > 0 && currentIndex >= items.length;

  function handleRate(rating: number) {
    if (!currentCard || reviewMutation.isPending) return;

    reviewMutation.mutate({
      cardId: currentCard.id,
      rating,
    });

    setReviewedCount((prev) => prev + 1);
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  }

  function handleRestart() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setReviewedCount(0);
    refetch();
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass border border-purple-500/25 bg-gradient-to-r from-purple-950/40 via-surface-900/60 to-indigo-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs font-semibold text-purple-300 w-fit mb-2">
            <Sparkles size={12} className="text-purple-400" />
            Método Anki com Algoritmo SM-2
          </span>
          <h2 className="text-2xl font-bold text-surface-100">
            Flashcards de Alta Retenção
          </h2>
          <p className="text-xs sm:text-sm text-surface-300 mt-1 max-w-xl">
            Memorização rápida de conceitos fundamentais, jurisprudência e armadilhas da banca com repetição espaçada personalizada.
          </p>
        </div>

        {items.length > 0 && !isFinished && (
          <div className="px-4 py-2.5 rounded-2xl glass border border-surface-700/60 text-xs font-semibold text-surface-300">
            Card <strong className="text-purple-300">{currentIndex + 1}</strong> de {items.length}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 glass rounded-3xl border border-surface-700/40">
          <Loader2 size={36} className="animate-spin text-purple-400 mb-3" />
          <p className="text-xs text-surface-400">Montando baralho personalizado de flashcards...</p>
        </div>
      )}

      {/* Estado Concluído */}
      {!isLoading && isFinished && (
        <div className="p-8 sm:p-12 rounded-3xl glass border border-purple-500/30 bg-surface-900/50 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-purple-600/30">
            <Trophy size={40} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-surface-100">Sessão de Flashcards Finalizada!</h3>
            <p className="text-xs sm:text-sm text-surface-300 mt-1">
              Você revisou <strong>{reviewedCount}</strong> cards. O algoritmo já reprogramou as próximas repetições conforme seu nível de domínio.
            </p>
          </div>
          <button
            onClick={handleRestart}
            className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-2 mx-auto"
          >
            <RotateCcw size={16} />
            <span>Revisar Novo Lote</span>
          </button>
        </div>
      )}

      {/* Estado Ativo: Card Central */}
      {!isLoading && !isFinished && currentCard && (
        <div className="space-y-6">
          {/* Card com efeito de Virar */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[320px] sm:min-h-[360px] p-8 sm:p-10 rounded-3xl glass border border-surface-700/60 hover:border-purple-500/40 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-2xl relative group bg-surface-900/60"
          >
            {/* Topo do Card */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 font-semibold">
                  {currentCard.disciplina}
                </span>
                <span className="text-surface-400">
                  {currentCard.assunto}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-surface-800 text-surface-400 text-[11px]">
                {currentCard.origem}
              </span>
            </div>

            {/* Conteúdo Central: Frente vs Verso */}
            <div className="my-auto py-6">
              <AnimatePresence mode="wait">
                {!isFlipped ? (
                  <motion.div
                    key="front"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">
                      Pergunta / Situação Fática
                    </span>
                    <p className="text-base sm:text-lg text-surface-100 leading-relaxed font-medium">
                      {currentCard.frente}
                    </p>
                    <p className="text-xs text-surface-500 pt-4 flex items-center gap-1.5">
                      <Layers size={13} />
                      Clique no card para revelar a resposta e fundamentação
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                      Gabarito & Justificativa
                    </span>
                    <p className="text-sm sm:text-base text-surface-200 leading-relaxed whitespace-pre-wrap">
                      {currentCard.verso}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rodapé do Card */}
            <div className="flex items-center justify-between text-xs text-surface-400 pt-4 border-t border-surface-700/30">
              <span>{isFlipped ? 'Como foi a recordação deste conceito?' : 'Toque para virar'}</span>
              <span className="text-purple-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                {isFlipped ? 'Avalie abaixo' : 'Ver verso'} <ChevronRight size={13} />
              </span>
            </div>
          </div>

          {/* Botões de Autoavaliação SM-2 */}
          {isFlipped ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              <button
                onClick={() => handleRate(0)}
                disabled={reviewMutation.isPending}
                className="p-3.5 rounded-2xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-200 text-xs sm:text-sm font-bold transition-all cursor-pointer flex flex-col items-center gap-1 shadow-md shadow-red-950/30"
              >
                <span>Errei (0)</span>
                <span className="text-[11px] font-normal text-red-400">Volta amanhã</span>
              </button>

              <button
                onClick={() => handleRate(2)}
                disabled={reviewMutation.isPending}
                className="p-3.5 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-200 text-xs sm:text-sm font-bold transition-all cursor-pointer flex flex-col items-center gap-1 shadow-md shadow-amber-950/30"
              >
                <span>Difícil (2)</span>
                <span className="text-[11px] font-normal text-amber-400">Volta em 2 dias</span>
              </button>

              <button
                onClick={() => handleRate(4)}
                disabled={reviewMutation.isPending}
                className="p-3.5 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-200 text-xs sm:text-sm font-bold transition-all cursor-pointer flex flex-col items-center gap-1 shadow-md shadow-blue-950/30"
              >
                <span>Bom (4)</span>
                <span className="text-[11px] font-normal text-blue-400">Volta em 5 dias</span>
              </button>

              <button
                onClick={() => handleRate(5)}
                disabled={reviewMutation.isPending}
                className="p-3.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm font-bold transition-all cursor-pointer flex flex-col items-center gap-1 shadow-md shadow-emerald-950/30"
              >
                <span>Fácil (5)</span>
                <span className="text-[11px] font-normal text-emerald-400">Volta em 10 dias</span>
              </button>
            </motion.div>
          ) : (
            <div className="text-center text-xs text-surface-500">
              Pressione a barra de espaço ou clique no card para virar e avaliar seu domínio
            </div>
          )}
        </div>
      )}
    </div>
  );
}
