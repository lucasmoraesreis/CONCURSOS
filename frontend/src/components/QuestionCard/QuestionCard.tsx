/**
 * QuestionCard — Card de questão individual interativo
 *
 * Recursos:
 * - Header com metadados (banca, ano, órgão, modalidade, nível, fonte oficial/PCI/IA, relevância)
 * - Tutor IA Socrático ("Tira-Dúvidas Instantâneo" com chat interativo)
 * - Ferramenta de Riscar/Eliminar alternativas (Strikethrough) para descarte visual
 * - Ações de estudo: Favoritar (coração), Anotações pessoais (bloco de notas), Reportar erro (bandeira)
 * - Enunciado completo com tipografia e espaçamento confortáveis
 * - Alternativas com feedback visual dinâmico (verde/vermelho ao responder)
 * - Registro automático de desempenho e alimentação da repetição espaçada
 * - Acordeom de "Análise da Banca & Pegadinha Cognitiva"
 * - Acordeom de "Justificativa Completa IA"
 * - Indicadores de histórico de tentativas e próxima data de revisão
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Lightbulb, Award, BookOpen, Tag, CheckCircle, XCircle,
  Sparkles, AlertTriangle, Target, Heart, StickyNote, Flag, Save, Database,
  RotateCcw, Bot, Strikethrough, Send, Loader2, Volume2, VolumeX,
  GitFork, ShieldAlert, Zap, Scale, Building2, Gavel
} from 'lucide-react';

import type {
  Questao,
  TutorChatMessage,
  QuestaoEstatisticasResponse,
  RecursoResponse,
  JurisprudenciaResponse,
} from '../../types';
import {
  answerQuestion,
  reportQuestion,
  saveQuestionNote,
  toggleQuestionFavorite,
  askTutor,
  fetchQuestaoEstatisticas,
  submeterRecurso,
  fetchJurisprudencia,
} from '../../api/client';
import { sanitizeHtml, sanitizeText } from '../../utils/sanitize';

interface QuestionCardProps {
  questao: Questao;
  index: number;
}

export function QuestionCard({ questao, index }: QuestionCardProps) {
  const queryClient = useQueryClient();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showJustificativa, setShowJustificativa] = useState(false);
  const [showPegadinha, setShowPegadinha] = useState(false);
  const [isFavorite, setIsFavorite] = useState(Boolean(questao.is_favorita));
  const [showNote, setShowNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(questao.anotacao || '');
  const [showReport, setShowReport] = useState(false);
  const [reportDraft, setReportDraft] = useState('');
  const [savedNote, setSavedNote] = useState(questao.anotacao || '');
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  // Ferramenta de Riscar Alternativas (Strikethrough)
  const [strikedOptions, setStrikedOptions] = useState<Record<string, boolean>>({});

  // Tutor IA Socrático
  const [showTutor, setShowTutor] = useState(false);
  const [tutorMessages, setTutorMessages] = useState<TutorChatMessage[]>([]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorMode, setTutorMode] = useState<'socratico' | 'direto'>('socratico');

  // Áudio TTS e Mapa Mental
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showMapaMental, setShowMapaMental] = useState(false);

  // Estatísticas & Pegadinha da Banca
  const [stats, setStats] = useState<QuestaoEstatisticasResponse | null>(null);


  // Recurso Administrativo da Banca (Debate Multiagente Especialista)
  const [showRecursoModal, setShowRecursoModal] = useState(false);
  const [recursoAlternativa, setRecursoAlternativa] = useState('A');
  const [recursoTipoPedido, setRecursoTipoPedido] = useState<'anulacao' | 'alteracao_gabarito'>('anulacao');
  const [recursoArgumento, setRecursoArgumento] = useState('');
  const [recursoParecer, setRecursoParecer] = useState<RecursoResponse | null>(null);
  const [isSubmittingRecurso, setIsSubmittingRecurso] = useState(false);

  // Raio-X Jurisprudencial & Súmulas
  const [showJurisprudencia, setShowJurisprudencia] = useState(false);
  const [jurisprudenciaData, setJurisprudenciaData] = useState<JurisprudenciaResponse | null>(null);
  const [isLoadingJuris, setIsLoadingJuris] = useState(false);


  const hasAnswered = selectedAnswer !== null;

  // Síntese de Voz Nativa (TTS em pt-BR)
  function handleToggleAudio() {
    if (!('speechSynthesis' in window)) {
      alert('Síntese de voz não suportada neste navegador.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const textToSpeak = `${questao.enunciado}. ${
      questao.justificativa_ia ? 'Justificativa do professor: ' + questao.justificativa_ia : ''
    }`;
    const cleanText = textToSpeak.replace(/<[^>]+>/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function refreshStudyQueries() {
    queryClient.invalidateQueries({ queryKey: ['study-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['study-gamification'] });
    queryClient.invalidateQueries({ queryKey: ['study-errors'] });
    queryClient.invalidateQueries({ queryKey: ['study-reviews'] });
    queryClient.invalidateQueries({ queryKey: ['study-favorites'] });
    queryClient.invalidateQueries({ queryKey: ['smart-simulado'] });
    queryClient.invalidateQueries({ queryKey: ['study-streak'] });
  }

  const answerMutation = useMutation({
    mutationFn: answerQuestion,
    onSuccess: refreshStudyQueries,
  });

  const handleSelectAnswer = useCallback((letra: string) => {
    if (hasAnswered) return;
    setSelectedAnswer(letra);
    setShowAnswer(true);
    setRecursoAlternativa(letra);
    fetchQuestaoEstatisticas(questao.id)
      .then((res) => setStats(res))
      .catch((err) => console.error('Falha ao carregar estatísticas:', err));


    answerMutation.mutate({
      questao_id: questao.id,
      alternativa: letra,
      tempo_segundos: 0,
    });
  }, [hasAnswered, questao.id, answerMutation]);

  const handleToggleJurisprudencia = async () => {
    if (!showJurisprudencia && !jurisprudenciaData) {
      setIsLoadingJuris(true);
      try {
        const data = await fetchJurisprudencia(questao.id);
        setJurisprudenciaData(data);
      } catch (err) {
        console.error('Falha ao carregar jurisprudência:', err);
      } finally {
        setIsLoadingJuris(false);
      }
    }
    setShowJurisprudencia((prev) => !prev);
  };

  const handleOpenRecurso = () => {
    setRecursoAlternativa(selectedAnswer || 'A');
    setShowRecursoModal(true);
  };

  const handleSubmitRecurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recursoArgumento.trim() || isSubmittingRecurso) return;
    setIsSubmittingRecurso(true);
    try {
      const resp = await submeterRecurso(questao.id, {
        alternativa_marcada: recursoAlternativa,
        argumentacao: recursoArgumento,
        tipo_pedido: recursoTipoPedido,
      });
      setRecursoParecer(resp);
    } catch (err) {
      console.error('Erro ao submeter recurso:', err);
    } finally {
      setIsSubmittingRecurso(false);
    }
  };


  // Atalhos de Teclado Profissionais (Power-User Mode)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const key = e.key.toUpperCase();

      if (key === 'J') {
        e.preventDefault();
        setShowJustificativa((prev) => !prev);
        return;
      }
      if (key === 'T') {
        e.preventDefault();
        setShowTutor((prev) => !prev);
        return;
      }

      if (!hasAnswered) {
        // Suporte a teclas numéricas 1..5 ou letras A..E
        let targetLetter: string | null = null;
        if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
          targetLetter = key;
        } else if (['1', '2', '3', '4', '5'].includes(key)) {
          const numIndex = parseInt(key) - 1;
          if (questao.alternativas[numIndex]) {
            targetLetter = questao.alternativas[numIndex].letra;
          }
        }

        if (targetLetter) {
          const opt = questao.alternativas.find((a) => a.letra.toUpperCase() === targetLetter);
          if (opt) {
            e.preventDefault();
            handleSelectAnswer(opt.letra);
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (isSpeaking && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [hasAnswered, questao.alternativas, isSpeaking, handleSelectAnswer]);

  const favoriteMutation = useMutation({
    mutationFn: () => toggleQuestionFavorite(questao.id),
    onSuccess: (data) => {
      setIsFavorite(data.is_favorite);
      refreshStudyQueries();
    },
  });

  const noteMutation = useMutation({
    mutationFn: () => saveQuestionNote(questao.id, noteDraft),
    onSuccess: (data) => {
      setSavedNote(data.note || '');
      refreshStudyQueries();
    },
  });

  const reportMutation = useMutation({
    mutationFn: () => reportQuestion(questao.id, reportDraft),
    onSuccess: () => {
      setReportDraft('');
      setReportFeedback('Apontamento enviado para revisão com sucesso!');
      setTimeout(() => {
        setShowReport(false);
        setReportFeedback(null);
      }, 2000);
    },
  });

  const tutorMutation = useMutation({
    mutationFn: askTutor,
    onSuccess: (data) => {
      setTutorMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.resposta }
      ]);
    },
  });



  function handleToggleStrike(letra: string, e: React.MouseEvent) {
    e.stopPropagation();
    setStrikedOptions((prev) => ({ ...prev, [letra]: !prev[letra] }));
  }

  function handleSendTutorQuestion(textToSend?: string) {
    const q = textToSend || tutorInput;
    if (!q.trim() || tutorMutation.isPending) return;

    const newMessages: TutorChatMessage[] = [
      ...tutorMessages,
      { role: 'user', content: q.trim() }
    ];
    setTutorMessages(newMessages);
    setTutorInput('');

    tutorMutation.mutate({
      questao_id: questao.id,
      pergunta: q.trim(),
      historico: newMessages,
      modo: tutorMode,
    });
  }

  function getAlternativaStyle(letra: string) {
    const isStriked = Boolean(strikedOptions[letra]);

    if (!showAnswer) {
      if (isStriked) {
        return 'border-surface-800 bg-surface-900/40 text-surface-500 line-through opacity-40 hover:opacity-70';
      }
      return letra === selectedAnswer
        ? 'border-primary-500 bg-primary-500/10'
        : 'border-surface-600/40 hover:border-surface-500 hover:bg-surface-700/30';
    }

    const isCorrect = letra === questao.alternativa_correta;
    const isSelected = letra === selectedAnswer;

    if (isCorrect) return 'border-emerald-500 bg-emerald-500/10 text-emerald-200';
    if (isSelected && !isCorrect) return 'border-red-500 bg-red-500/10 text-red-200';
    return 'border-surface-700/40 opacity-40';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`rounded-2xl glass overflow-hidden transition-all duration-200 border border-surface-700/40 ${questao.is_inedita ? 'ring-1 ring-purple-500/30 shadow-lg shadow-purple-500/5' : ''
        }`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-700/30 flex flex-wrap items-center justify-between gap-3 bg-surface-900/30">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {/* Número */}
          <div className={`flex items-center justify-center w-8 h-8 rounded-xl text-white text-xs font-bold shadow-sm shrink-0 ${questao.is_inedita
              ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
              : 'bg-gradient-to-br from-primary-500 to-primary-700'
            }`}>
            #{questao.numero_questao}
          </div>

          {/* Badges Principais */}
          {questao.is_inedita ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-xs font-semibold text-purple-300">
              <Sparkles size={12} className="text-purple-400" />
              Inédita (IA)
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-700/50 border border-surface-600/30 text-xs font-medium text-surface-300">
              <Database size={11} className="text-primary-400" />
              {questao.fonte || 'PCI Concursos / Oficial'}
            </span>
          )}

          {questao.similarity !== null && questao.similarity !== undefined && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-medium text-emerald-300">
              <Target size={12} className="text-emerald-400" />
              {(questao.similarity * 100).toFixed(0)}%
            </span>
          )}

          {questao.banca_nome && (
            <span className="px-2.5 py-1 rounded-lg bg-surface-700/60 text-xs font-medium text-surface-200">
              {questao.banca_nome}
            </span>
          )}
          {questao.concurso_ano && (
            <span className="px-2.5 py-1 rounded-lg bg-surface-700/60 text-xs font-mono text-surface-300">
              {questao.concurso_ano}
            </span>
          )}
          {questao.concurso_orgao && (
            <span className="px-2.5 py-1 rounded-lg bg-primary-500/15 text-xs font-medium text-primary-300 truncate max-w-[180px]" title={questao.concurso_orgao}>
              {questao.concurso_orgao}
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${questao.tipo_questao === 'Certo/Errado'
              ? 'bg-amber-500/15 text-amber-300'
              : 'bg-blue-500/15 text-blue-300'
            }`}>
            {questao.tipo_questao}
          </span>
        </div>

        {/* Botões de Ação: Áudio TTS, Tutor IA, Favorito, Anotação, Reportar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Áudio / Leitor de Enunciado (TTS) */}
          <button
            onClick={handleToggleAudio}
            title={isSpeaking ? "Parar leitura em áudio" : "Ouvir enunciado e comentário em áudio"}
            className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${isSpeaking
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                : 'border-surface-700/60 text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
              }`}
          >
            {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Tutor IA */}
          <button
            onClick={() => setShowTutor(!showTutor)}
            title="Tira-Dúvidas com Tutor IA Socrático (Atalho: T)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${showTutor
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm shadow-purple-500/20'
                : 'bg-surface-800/60 border-surface-700/50 text-surface-300 hover:text-purple-300 hover:bg-surface-700/60'
              }`}
          >
            <Bot size={15} className="text-purple-400" />
            <span className="hidden sm:inline">Tutor IA</span>
          </button>

          {/* Favoritar */}
          <button
            onClick={() => favoriteMutation.mutate()}
            disabled={favoriteMutation.isPending}
            title={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${isFavorite
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-surface-800/60 border-surface-700/50 text-surface-400 hover:text-rose-400 hover:bg-surface-700/60'
              }`}
          >
            <Heart size={15} className={isFavorite ? 'fill-rose-500' : ''} />
          </button>

          {/* Anotação */}
          <button
            onClick={() => setShowNote(!showNote)}
            title="Minhas anotações nesta questão"
            className={`p-2 rounded-xl border transition-all cursor-pointer ${showNote || savedNote
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-surface-800/60 border-surface-700/50 text-surface-400 hover:text-amber-300 hover:bg-surface-700/60'
              }`}
          >
            <StickyNote size={15} />
          </button>

          {/* Reportar */}
          <button
            onClick={() => setShowReport(!showReport)}
            title="Reportar problema ou contestar gabarito"
            className={`p-2 rounded-xl border transition-all cursor-pointer ${showReport
                ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                : 'bg-surface-800/60 border-surface-700/50 text-surface-400 hover:text-orange-300 hover:bg-surface-700/60'
              }`}
          >
            <Flag size={15} />
          </button>
        </div>
      </div>

      {/* Linha de Disciplina e Assunto */}
      <div className="px-6 py-2 bg-surface-900/10 border-b border-surface-700/20 flex flex-wrap items-center gap-3 text-xs text-surface-400">
        {questao.disciplina_nome && (
          <span className="flex items-center gap-1 font-medium text-surface-300">
            <BookOpen size={11} className="text-primary-400" />
            {questao.disciplina_nome}
          </span>
        )}
        {questao.assunto_nome && (
          <span className="flex items-center gap-1">
            <Tag size={11} className="text-surface-500" />
            {questao.assunto_nome}
          </span>
        )}
      </div>

      {/* Gaveta do Tutor IA Socrático */}
      <AnimatePresence>
        {showTutor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 pt-4"
          >
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 to-surface-900/90 border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                    <Bot size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-surface-100">
                      Tutor IA Concursos — Tira-Dúvidas Socrático
                    </h4>
                    <p className="text-[11px] text-surface-400">
                      Faça perguntas sobre o enunciado, conceitos ou alternativas
                    </p>
                  </div>
                </div>

                {/* Alternador de Modo Socrático vs Direto */}
                <div className="flex items-center p-1 rounded-xl bg-surface-900 border border-surface-700/60 text-[11px]">
                  <button
                    onClick={() => setTutorMode('socratico')}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${tutorMode === 'socratico' ? 'bg-purple-600 text-white' : 'text-surface-400'
                      }`}
                  >
                    Socrático
                  </button>
                  <button
                    onClick={() => setTutorMode('direto')}
                    className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${tutorMode === 'direto' ? 'bg-purple-600 text-white' : 'text-surface-400'
                      }`}
                  >
                    Direto
                  </button>
                </div>
              </div>

              {/* Sugestões de Perguntas Rápidas */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  "Me dê uma dica sem entregar a resposta",
                  "Qual a pegadinha da banca nessa questão?",
                  "Por que a alternativa correta é essa?",
                  "Existe jurisprudência ou súmula sobre o tema?",
                ].map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendTutorQuestion(sug)}
                    disabled={tutorMutation.isPending}
                    className="px-2.5 py-1 rounded-lg glass border border-purple-500/20 text-[11px] text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-all cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {/* Mensagens do Chat */}
              {tutorMessages.length > 0 && (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {tutorMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl text-xs leading-relaxed ${msg.role === 'user'
                          ? 'bg-surface-800/80 text-surface-200 ml-6 border border-surface-700/50'
                          : 'bg-purple-950/40 text-purple-200 mr-4 border border-purple-500/25'
                        }`}
                    >
                      <div className="text-[10px] font-bold text-surface-400 mb-1">
                        {msg.role === 'user' ? 'Você' : 'Tutor IA'}
                      </div>
                      <p className="whitespace-pre-wrap">{sanitizeHtml(msg.content)}</p>
                    </div>
                  ))}
                  {tutorMutation.isPending && (
                    <div className="flex items-center gap-2 text-xs text-purple-400 p-2">
                      <Loader2 size={14} className="animate-spin" />
                      <span>O Tutor está analisando a questão...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Input de Envio */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendTutorQuestion();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={tutorInput}
                  onChange={(e) => setTutorInput(e.target.value)}
                  placeholder="Escreva sua dúvida sobre esta questão..."
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-900 border border-surface-700/60 text-xs text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
                <button
                  type="submit"
                  disabled={tutorMutation.isPending || !tutorInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send size={13} />
                  <span>Enviar</span>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gaveta de Anotações Pessoais */}
      <AnimatePresence>
        {showNote && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 pt-4"
          >
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/25 space-y-3">
              <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <StickyNote size={14} />
                  Minhas Anotações & Mnemônicos
                </span>
                {savedNote && <span className="text-surface-400 font-normal">Anotação salva no seu perfil</span>}
              </div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Escreva pontos de atenção, súmulas, artigos de lei ou esquemas de memorização..."
                className="w-full h-20 p-3 rounded-lg bg-surface-900/90 border border-surface-700/70 text-xs text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-amber-400/50 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNote(false)}
                  className="px-3 py-1.5 rounded-lg glass text-xs text-surface-400 hover:text-surface-200 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={() => noteMutation.mutate()}
                  disabled={noteMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-surface-950 text-xs font-semibold hover:bg-amber-400 transition-all cursor-pointer"
                >
                  <Save size={13} />
                  {noteMutation.isPending ? 'Salvando...' : 'Salvar Anotação'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gaveta de Reportar Problema */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 pt-4"
          >
            <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/25 space-y-3">
              <span className="flex items-center gap-1.5 text-xs text-orange-300 font-semibold">
                <Flag size={14} />
                Reportar Erro ou Contestar Gabarito
              </span>
              {reportFeedback ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  {reportFeedback}
                </div>
              ) : (
                <>
                  <textarea
                    value={reportDraft}
                    onChange={(e) => setReportDraft(e.target.value)}
                    placeholder="Descreva o que está errado na questão, se o gabarito oficial foi alterado por recurso, ou se falta algum trecho..."
                    className="w-full h-20 p-3 rounded-lg bg-surface-900/90 border border-surface-700/70 text-xs text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-orange-400/50 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowReport(false)}
                      className="px-3 py-1.5 rounded-lg glass text-xs text-surface-400 hover:text-surface-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => reportMutation.mutate()}
                      disabled={reportMutation.isPending || !reportDraft.trim()}
                      className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-500 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {reportMutation.isPending ? 'Enviando...' : 'Enviar Reporte'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enunciado */}
      <div className="px-6 py-5">
        <p className="text-sm leading-relaxed text-surface-200 whitespace-pre-wrap">
          {questao.enunciado}
        </p>
      </div>

      {/* Alternativas com Ferramenta de Riscar (Strikethrough) */}
      <div className="px-6 pb-4 space-y-2">
        {questao.alternativas.map((alt) => {
          const isStriked = Boolean(strikedOptions[alt.letra]);
          return (
            <button
              key={alt.id || alt.letra}
              onClick={() => handleSelectAnswer(alt.letra)}
              disabled={hasAnswered}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200
                         flex flex-col gap-2 group cursor-pointer relative ${getAlternativaStyle(alt.letra)}`}
            >
              <div className="flex items-start gap-3 w-full">
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
                <span className="text-sm leading-relaxed pt-0.5 flex-1">
                  {alt.texto}
                </span>

                {/* Tag de Atalho e Botão de Riscar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!hasAnswered && (
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono text-surface-500 bg-surface-800/80 border border-surface-700/40">
                      [{alt.letra}]
                    </span>
                  )}
                  {!hasAnswered && (
                    <span
                      onClick={(e) => handleToggleStrike(alt.letra, e)}
                      title={isStriked ? "Restaurar alternativa" : "Eliminar alternativa (riscar)"}
                      className={`p-1 rounded-lg transition-all text-xs font-semibold ${isStriked
                          ? 'text-red-400 bg-red-500/10 opacity-100'
                          : 'text-surface-500 opacity-20 group-hover:opacity-80 hover:text-surface-300'
                        }`}
                    >
                      <Strikethrough size={14} />
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Distribuição de Escolhas & Marcador de Pegadinha */}
              {showAnswer && stats && (
                <div className="w-full pt-2 border-t border-surface-700/30 flex items-center gap-2">
                  <div className="flex-1 bg-surface-800/90 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        alt.letra === questao.alternativa_correta
                          ? 'bg-emerald-500'
                          : stats.pegadinha_letra === alt.letra
                          ? 'bg-amber-500'
                          : 'bg-surface-600'
                      }`}
                      style={{ width: `${stats.distribuicao?.find(d => d.letra === alt.letra)?.percentual || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-surface-400 font-semibold shrink-0">
                    {stats.distribuicao?.find(d => d.letra === alt.letra)?.percentual || 0}% dos alunos
                  </span>
                  {stats.pegadinha_letra === alt.letra && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-1">
                      ⚠️ Pegadinha da Banca
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
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
            <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm
              ${selectedAnswer === questao.alternativa_correta
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}>
              <div className="flex items-center gap-3">
                <Award size={18} />
                <span>
                  {selectedAnswer === questao.alternativa_correta
                    ? '🎉 Parabéns! Resposta correta!'
                    : `Resposta incorreta. Gabarito oficial: Alternativa ${questao.alternativa_correta}`
                  }
                </span>
              </div>
              <div className="text-xs text-surface-400 flex items-center gap-1.5">
                <RotateCcw size={12} />
                <span>Agendada na repetição espaçada</span>
              </div>
            </div>

            {/* Diagnóstico de Erro Cognitivo da IA */}
            {answerMutation.data?.tipo_erro && (
              <div className="mt-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200 shadow-sm">
                <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-2">
                    <span>Diagnóstico de Causa-Raiz do Erro:</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono uppercase tracking-wide border border-amber-500/30">
                      {answerMutation.data.tipo_erro}
                    </span>
                  </div>
                  <p className="text-amber-100/90 leading-relaxed">
                    {answerMutation.data.diagnostico_erro}
                  </p>
                </div>
              </div>
            )}
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
                         hover:from-purple-500/15 hover:to-indigo-600/15 transition-all duration-200 cursor-pointer"
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
                      Armadilha Cognitiva da Banca
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
                         hover:from-amber-500/15 hover:to-amber-600/10 transition-all duration-200 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Lightbulb size={16} />
                  Ver Comentário do Professor & Justificativa Detalhada
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
                      {sanitizeText(questao.justificativa_ia || '')}
                    </p>

                    {/* Botão de Mapa Mental Mermaid */}
                    {answerMutation.data?.mapa_mental_mermaid && (
                      <div className="mt-4 pt-3 border-t border-surface-700/50">
                        <button
                          onClick={() => setShowMapaMental(!showMapaMental)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-700/40 hover:bg-surface-700/70 text-xs font-semibold text-primary-300 transition-all cursor-pointer"
                        >
                          <GitFork size={13} />
                          <span>{showMapaMental ? 'Ocultar Mapa Mental' : 'Ver Mapa Mental Sintético'}</span>
                        </button>

                        {showMapaMental && (
                          <div className="mt-2.5 p-3 rounded-xl bg-surface-900/90 border border-surface-700/60">
                            <div className="text-[11px] font-bold text-surface-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                              <Zap size={12} className="text-amber-400" />
                              Fluxograma Lógico da Regra (Mermaid)
                            </div>
                            <pre className="text-xs font-mono text-emerald-300 bg-surface-950/70 p-3 rounded-lg overflow-x-auto whitespace-pre border border-emerald-500/20">
                              {answerMutation.data.mapa_mental_mermaid}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Accordion 3: Raio-X Jurisprudencial & Súmulas */}
          <div>
            <button
              onClick={handleToggleJurisprudencia}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl
                       bg-gradient-to-r from-blue-500/10 to-cyan-600/10
                       border border-blue-500/25 text-blue-300 text-sm font-medium
                       hover:from-blue-500/15 hover:to-cyan-600/15 transition-all duration-200 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-cyan-400" />
                🏛️ Raio-X Jurisprudencial & Súmulas dos Tribunais
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${showJurisprudencia ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showJurisprudencia && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-2 p-5 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-3"
                >
                  {isLoadingJuris ? (
                    <div className="flex items-center gap-2 text-xs text-blue-300 py-2">
                      <Loader2 size={15} className="animate-spin text-blue-400" />
                      <span>Consultando precedentes e súmulas dos tribunais superiores...</span>
                    </div>
                  ) : jurisprudenciaData ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-blue-500/20">
                        <span className="text-xs font-semibold text-blue-300">
                          {jurisprudenciaData.tema_central}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-200 border border-blue-500/30">
                          Banca: {jurisprudenciaData.banca}
                        </span>
                      </div>
                      <p className="text-xs text-surface-300 leading-relaxed italic">
                        {jurisprudenciaData.posicionamento_banca}
                      </p>
                      <div className="space-y-2.5 pt-1">
                        {jurisprudenciaData.jurisprudencias.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-surface-900/80 border border-surface-700/60 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                                  {item.tribunal}
                                </span>
                                {item.numero_identificador}
                              </span>
                              <span className="text-[10px] text-surface-400">{item.tipo}</span>
                            </div>
                            <p className="text-surface-200 font-medium">{item.enunciado_resumo}</p>
                            <p className="text-surface-400 text-[11px] pt-1 border-t border-surface-800">
                              <strong className="text-blue-300">Aplicação no item:</strong> {item.aplicacao_na_questao}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-surface-400">Nenhuma jurisprudência específica cadastrada.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Barra de Ações: Dica Antídoto da Pegadinha & Entrar com Recurso */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            {stats?.dica_antidoto && (
              <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                <Lightbulb size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Dica Antídoto da Pegadinha: </span>
                  <span>{stats.dica_antidoto}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleOpenRecurso}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600/20 to-amber-600/20 border border-rose-500/30 hover:border-rose-400 text-rose-200 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:from-rose-600/30 hover:to-amber-600/30"
            >
              <Gavel size={14} className="text-rose-400" />
              <span>⚖️ Entrar com Recurso (Simulador de Banca)</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Simulador de Recursos da Banca */}
      <AnimatePresence>
        {showRecursoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-5"
            >
              <div className="flex items-center justify-between border-b border-surface-700/50 pb-3">
                <div className="flex items-center gap-2">
                  <Scale size={20} className="text-amber-400" />
                  <h3 className="text-base font-bold text-surface-100">
                    Simulador de Recursos da Banca Examinadora
                  </h3>
                </div>
                <button
                  onClick={() => setShowRecursoModal(false)}
                  className="text-surface-400 hover:text-surface-200 text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {!recursoParecer ? (
                <form onSubmit={handleSubmitRecurso} className="space-y-4">
                  <div className="p-3 rounded-xl bg-surface-800/60 border border-surface-700/40 text-xs text-surface-300">
                    <p>
                      Simule a interposição de um recurso administrativo formal contra o gabarito preliminar da banca{' '}
                      <strong className="text-surface-100">{questao.banca_nome || 'Examinadora'}</strong>.
                      A IA emulará o debate multiagente da comissão julgadora e emitirá o parecer fundamentado.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-surface-300 mb-1">
                        Sua Alternativa Defendida:
                      </label>
                      <select
                        value={recursoAlternativa}
                        onChange={(e) => setRecursoAlternativa(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-xs text-surface-100"
                      >
                        {questao.alternativas.map((alt) => (
                          <option key={alt.letra} value={alt.letra}>
                            Alternativa {alt.letra}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-surface-300 mb-1">
                        Objeto do Pedido:
                      </label>
                      <select
                        value={recursoTipoPedido}
                        onChange={(e) => setRecursoTipoPedido(e.target.value as 'anulacao' | 'alteracao_gabarito')}
                        className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-xs text-surface-100"
                      >
                        <option value="anulacao">Anulação da Questão (vício insanável)</option>
                        <option value="alteracao_gabarito">Alteração de Gabarito Oficial</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-300 mb-1">
                      Razões Recursais & Fundamentação Teórica / Jurisprudencial:
                    </label>
                    <textarea
                      value={recursoArgumento}
                      onChange={(e) => setRecursoArgumento(e.target.value)}
                      placeholder="Exponha com clareza a ambiguidade, duplicidade de respostas, violação legal ou divergência sumular que ampara seu recurso..."
                      className="w-full h-32 p-3 rounded-xl bg-surface-800 border border-surface-700 text-xs text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      required
                      minLength={10}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRecursoModal(false)}
                      className="px-4 py-2 rounded-xl glass text-xs text-surface-400 hover:text-surface-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingRecurso || !recursoArgumento.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-amber-600/30 transition-all cursor-pointer"
                    >
                      {isSubmittingRecurso ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Comissão Examinadora Julgando...</span>
                        </>
                      ) : (
                        <>
                          <Gavel size={14} />
                          <span>Submeter Recurso à Banca</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                      recursoParecer.parecer === 'DEFERIDO'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : recursoParecer.parecer === 'ANULADO'
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Gavel size={24} />
                      <div>
                        <div className="text-xs uppercase tracking-wider font-bold">
                          Parecer da Comissão Examinadora ({recursoParecer.banca})
                        </div>
                        <div className="text-lg font-black">{recursoParecer.parecer}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-semibold text-surface-300">Gabarito: </span>
                      <strong className="text-surface-100">{recursoParecer.gabarito_oficial_mantido_ou_novo}</strong>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3.5 rounded-xl bg-surface-800/80 border border-surface-700/60 space-y-1">
                      <span className="font-bold text-surface-200">Fundamentação Oficial da Banca:</span>
                      <p className="text-surface-300 leading-relaxed">{recursoParecer.fundamentacao_banca}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface-800/80 border border-surface-700/60 space-y-1">
                      <span className="font-bold text-surface-200">Análise do Ponto Arguido:</span>
                      <p className="text-surface-300 leading-relaxed">{recursoParecer.analise_pontual}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-800/40 border border-surface-700/40 text-surface-400">
                      <strong>Impacto na Prova:</strong> {recursoParecer.impacto_pontuacao}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setRecursoParecer(null);
                        setRecursoArgumento('');
                        setShowRecursoModal(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs transition-all cursor-pointer"
                    >
                      Concluir Análise
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

