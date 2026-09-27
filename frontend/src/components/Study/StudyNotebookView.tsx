/**
 * StudyNotebookView.tsx — Caderno de Erros, Revisão Espaçada & Favoritas
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  XCircle, Clock, Heart, Loader2, Sparkles, RefreshCw
} from 'lucide-react';
import { fetchStudyErrors, fetchStudyReviews, fetchStudyFavorites } from '../../api/client';
import { QuestionCard } from '../QuestionCard/QuestionCard';

export type NotebookTab = 'errors' | 'reviews' | 'favorites';

interface StudyNotebookViewProps {
  initialTab?: NotebookTab;
}

export function StudyNotebookView({ initialTab = 'errors' }: StudyNotebookViewProps) {
  const [activeTab, setActiveTab] = useState<NotebookTab>(initialTab);

  // Queries para cada modo
  const {
    data: errorsData,
    isLoading: isErrorsLoading,
    refetch: refetchErrors,
  } = useQuery({
    queryKey: ['study-errors'],
    queryFn: () => fetchStudyErrors(50),
    enabled: activeTab === 'errors',
  });

  const {
    data: reviewsData,
    isLoading: isReviewsLoading,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['study-reviews'],
    queryFn: () => fetchStudyReviews(50),
    enabled: activeTab === 'reviews',
  });

  const {
    data: favoritesData,
    isLoading: isFavoritesLoading,
    refetch: refetchFavorites,
  } = useQuery({
    queryKey: ['study-favorites'],
    queryFn: () => fetchStudyFavorites(50),
    enabled: activeTab === 'favorites',
  });

  const currentData =
    activeTab === 'errors'
      ? errorsData
      : activeTab === 'reviews'
        ? reviewsData
        : favoritesData;

  const isLoading =
    activeTab === 'errors'
      ? isErrorsLoading
      : activeTab === 'reviews'
        ? isReviewsLoading
        : isFavoritesLoading;

  function handleRefresh() {
    if (activeTab === 'errors') refetchErrors();
    else if (activeTab === 'reviews') refetchReviews();
    else refetchFavorites();
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header com Tabs de Seleção */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl glass border border-surface-700/40">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-900/60 border border-surface-700/50">
          <button
            onClick={() => setActiveTab('errors')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'errors'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <XCircle size={15} />
            <span>Caderno de Erros</span>
            {errorsData && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px]">
                {errorsData.total}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Clock size={15} />
            <span>Revisão Espaçada</span>
            {reviewsData && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px]">
                {reviewsData.total}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Heart size={15} />
            <span>Favoritas</span>
            {favoritesData && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-white/20 text-[11px]">
                {favoritesData.total}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-surface-700/50 text-xs font-semibold text-surface-300 hover:text-surface-100 hover:border-surface-600 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Explicação da Aba Ativa */}
      <div className="p-4 rounded-2xl glass border border-surface-700/30 text-xs text-surface-300 flex items-center justify-between">
        {activeTab === 'errors' && (
          <p>
            ❌ <strong className="text-surface-100">Caderno de Erros:</strong> Todas as questões que você marcou incorretamente. Ao acertá-las, elas avançam no ciclo de fixação.
          </p>
        )}
        {activeTab === 'reviews' && (
          <p>
            ⏳ <strong className="text-surface-100">Revisão Espaçada (Curva de Ebbinghaus):</strong> Questões agendadas pelo algoritmo nos intervalos de 1, 3, 7 e 15 dias para fixação permanente.
          </p>
        )}
        {activeTab === 'favorites' && (
          <p>
            ⭐ <strong className="text-surface-100">Questões Favoritas:</strong> Seu acervo pessoal de questões marcadas com o coração para estudo aprofundado ou revisão de véspera.
          </p>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 glass rounded-3xl border border-surface-700/40">
          <Loader2 size={32} className="animate-spin text-primary-400 mb-3" />
          <p className="text-xs text-surface-400">Carregando questões do seu caderno...</p>
        </div>
      )}

      {/* Estado Vazio */}
      {!isLoading && (!currentData || currentData.items.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl glass border border-surface-700/40 p-8">
          <div className="w-16 h-16 rounded-2xl bg-surface-800/80 flex items-center justify-center mb-4 text-surface-400">
            {activeTab === 'errors' ? (
              <Sparkles size={28} className="text-emerald-400" />
            ) : activeTab === 'reviews' ? (
              <Clock size={28} className="text-amber-400" />
            ) : (
              <Heart size={28} className="text-rose-400" />
            )}
          </div>
          <h3 className="text-lg font-bold text-surface-200 mb-1">
            {activeTab === 'errors'
              ? 'Nenhum erro registrado!'
              : activeTab === 'reviews'
                ? 'Nenhuma revisão pendente para agora!'
                : 'Nenhuma questão favoritada ainda.'}
          </h3>
          <p className="text-xs text-surface-400 max-w-md">
            {activeTab === 'errors'
              ? 'Parabéns! Conforme você responde questões no banco ou simulados, os erros aparecem automaticamente aqui.'
              : activeTab === 'reviews'
                ? 'Você está em dia com a repetição espaçada. Responda novas questões para agendar os próximos ciclos.'
                : 'Clique no ícone de coração em qualquer questão para guardar nesta lista.'}
          </p>
        </div>
      )}

      {/* Lista de Questões */}
      {!isLoading && currentData && currentData.items.length > 0 && (
        <div className="space-y-5">
          <div className="text-xs text-surface-400">
            Exibindo <strong className="text-surface-200">{currentData.items.length}</strong> questão{currentData.items.length !== 1 ? 'ões' : ''}
          </div>
          {currentData.items.map((q, i) => (
            <QuestionCard key={q.id} questao={q} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
