/**
 * QuestionCard — Card de questão individual
 *
 * Exibe:
 * - Header com metadados (banca, ano, órgão, badge Inédita IA, score semântico)
 * - Enunciado completo
 * - Alternativas interativas com highlight da correta
 * - Accordion de Análise da Banca & Pegadinha Cognitiva (Hacker de Bancas)
 * - Accordion de justificativa IA
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Lightbulb, Award, BookOpen, Tag, CheckCircle, XCircle,
  Sparkles, AlertTriangle, Target
} from 'lucide-react';
import type { Questao } from '../../types';

interface QuestionCardProps {
  questao: Questao;
  index: number;
}

export function QuestionCard({ questao, index }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showJustificativa, setShowJustificativa] = useState(false);
  const [showPegadinha, setShowPegadinha] = useState(false);

  const hasAnswered = selectedAnswer !== null;

  function handleSelectAnswer(letra: string) {
    if (hasAnswered) return;
    setSelectedAnswer(letra);
    setShowAnswer(true);
  }

  function getAlternativaStyle(letra: string) {
    if (!showAnswer) {
      return letra === selectedAnswer
        ? 'border-primary-500 bg-primary-500/10'
        : 'border-surface-600/40 hover:border-surface-500 hover:bg-surface-700/30';
    }

    const isCorrect = letra === questao.alternativa_correta;
    const isSelected = letra === selectedAnswer;

    if (isCorrect) return 'border-emerald-500 bg-emerald-500/10 text-emerald-200';
    if (isSelected && !isCorrect) return 'border-red-500 bg-red-500/10 text-red-200';
    return 'border-surface-700/40 opacity-50';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`rounded-2xl glass overflow-hidden transition-all duration-200 ${
        questao.is_inedita ? 'ring-1 ring-purple-500/30 shadow-lg shadow-purple-500/5' : ''
      }`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-700/30 flex flex-wrap items-center gap-3">
        {/* Número */}
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl text-white text-sm font-bold shadow-sm ${
          questao.is_inedita
            ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
            : 'bg-gradient-to-br from-primary-500 to-primary-700'
        }`}>
          {questao.numero_questao}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {questao.is_inedita && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-xs font-semibold text-purple-300">
              <Sparkles size={12} className="text-purple-400" />
              Questão Inédita (IA)
            </span>
          )}

          {questao.similarity !== null && questao.similarity !== undefined && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-medium text-emerald-300">
              <Target size={12} className="text-emerald-400" />
              Relevância: {(questao.similarity * 100).toFixed(0)}%
            </span>
          )}

          {questao.banca_nome && (
            <span className="px-2.5 py-1 rounded-lg bg-surface-700/60 text-xs font-medium text-surface-300">
              {questao.banca_nome}
            </span>
          )}
          {questao.concurso_ano && (
            <span className="px-2.5 py-1 rounded-lg bg-surface-700/60 text-xs font-mono text-surface-300">
              {questao.concurso_ano}
            </span>
          )}
          {questao.concurso_orgao && (
            <span className="px-2.5 py-1 rounded-lg bg-primary-500/15 text-xs font-medium text-primary-300">
              {questao.concurso_orgao}
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium
            ${questao.tipo_questao === 'Certo/Errado'
              ? 'bg-amber-500/15 text-amber-300'
              : 'bg-blue-500/15 text-blue-300'
            }`}>
            {questao.tipo_questao}
          </span>
        </div>

        {/* Disciplina + Assunto */}
        <div className="flex items-center gap-3 text-xs text-surface-400">
          {questao.disciplina_nome && (
            <span className="flex items-center gap-1">
              <BookOpen size={11} />
              {questao.disciplina_nome}
            </span>
          )}
          {questao.assunto_nome && (
            <span className="flex items-center gap-1">
              <Tag size={11} />
              {questao.assunto_nome}
            </span>
          )}
        </div>
      </div>

      {/* Enunciado */}
      <div className="px-6 py-5">
        <p className="text-sm leading-relaxed text-surface-200 whitespace-pre-wrap">
          {questao.enunciado}
        </p>
      </div>

      {/* Alternativas */}
      <div className="px-6 pb-4 space-y-2">
        {questao.alternativas.map((alt) => (
          <button
            key={alt.id || alt.letra}
            onClick={() => handleSelectAnswer(alt.letra)}
            disabled={hasAnswered}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200
                       flex items-start gap-3 group ${getAlternativaStyle(alt.letra)}`}
          >
            {/* Letra */}
            <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                            text-xs font-bold transition-colors
                            ${showAnswer && alt.letra === questao.alternativa_correta
                              ? 'bg-emerald-500 text-white'
                              : showAnswer && alt.letra === selectedAnswer
                                ? 'bg-red-500 text-white'
                                : 'bg-surface-700/60 text-surface-300 group-hover:bg-surface-600/60'
                            }`}>
              {showAnswer && alt.letra === questao.alternativa_correta ? (
                <CheckCircle size={14} />
              ) : showAnswer && alt.letra === selectedAnswer ? (
                <XCircle size={14} />
              ) : (
                alt.letra
              )}
            </span>

            {/* Texto */}
            <span className="text-sm leading-relaxed pt-0.5">
              {alt.texto}
            </span>
          </button>
        ))}
      </div>

      {/* Feedback de resposta */}
      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 pb-4"
          >
            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm
              ${selectedAnswer === questao.alternativa_correta
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}>
              <Award size={18} />
              {selectedAnswer === questao.alternativa_correta
                ? '🎉 Parabéns! Resposta correta!'
                : `Resposta incorreta. Gabarito oficial: ${questao.alternativa_correta}`
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ações pós-resposta: Pegadinha & Justificativa */}
      {showAnswer && (
        <div className="px-6 pb-5 space-y-3">
          {/* Accordion 1: Análise da Banca & Pegadinha Cognitiva */}
          {questao.engenharia_da_pegadinha && (
            <div>
              <button
                onClick={() => setShowPegadinha(!showPegadinha)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl
                         bg-gradient-to-r from-purple-500/10 to-indigo-600/10
                         border border-purple-500/25 text-purple-300 text-sm font-medium
                         hover:from-purple-500/15 hover:to-indigo-600/15 transition-all duration-200"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-purple-400" />
                  🎯 Análise da Banca & Engenharia da Pegadinha
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${showPegadinha ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {showPegadinha && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-2 p-5 rounded-xl bg-purple-950/20 border border-purple-500/20"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2">
                      Armadilha Cognitiva Inserida
                    </p>
                    <p className="text-sm leading-relaxed text-surface-300 whitespace-pre-wrap">
                      {questao.engenharia_da_pegadinha}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Accordion 2: Justificativa Completa IA */}
          {questao.justificativa_ia && (
            <div>
              <button
                onClick={() => setShowJustificativa(!showJustificativa)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl
                         bg-gradient-to-r from-amber-500/10 to-amber-600/5
                         border border-amber-500/20 text-amber-300 text-sm font-medium
                         hover:from-amber-500/15 hover:to-amber-600/10 transition-all duration-200"
              >
                <span className="flex items-center gap-2">
                  <Lightbulb size={16} />
                  Ver Justificativa Detalhada (IA)
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${showJustificativa ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {showJustificativa && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-2 p-5 rounded-xl bg-surface-800/50 border border-surface-700/30"
                  >
                    <p className="text-sm leading-relaxed text-surface-300 whitespace-pre-wrap">
                      {questao.justificativa_ia}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
