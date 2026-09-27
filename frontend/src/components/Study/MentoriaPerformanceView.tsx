/**
 * MentoriaPerformanceView.tsx — Ecossistema de Mentoria VIP & Alta Performance
 *
 * Módulos integrados:
 * 1. ✍️ Laboratório de Redação Discursiva (Correção com IA de Banca: Cebraspe, FGV, FCC, Vunesp)
 * 2. 🧠 Psicólogo Especialista em Concursos (Foco, Disciplina, Ansiedade Pré-Prova)
 * 3. 📅 Cronogramas Semanais Inteligentes & Trilhas de Estudo Prontas
 * 4. 🏆 Ranking Exclusivo de Concorrentes em Tempo Real
 * 5. 💬 Mentoria Coletiva & Comunidade WhatsApp VIP
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  PenTool, Brain, Calendar, Trophy, MessageCircle,
  Sparkles, CheckCircle2, AlertCircle, Loader2, Send, Lightbulb,
  Award, Target, HeartHandshake, FileText, Check
} from 'lucide-react';
import {
  fetchRedacaoTemas,
  corrigirRedacao,
  consultarPsicologo,
  fetchCronogramaSemanal,
  fetchRankingConcorrentes,
} from '../../api/client';
import type {
  RedacaoCorrigirResponse,
  PsicologoConsultaResponse,
} from '../../types';


type TabKey = 'redacao' | 'psicologo' | 'cronograma' | 'ranking' | 'comunidade';

export function MentoriaPerformanceView() {
  const [activeTab, setActiveTab] = useState<TabKey>('redacao');

  // ==========================================
  // ESTADO: REDAÇÃO DISCURSIVA
  // ==========================================
  const { data: temasRedacao, isLoading: isLoadingTemas } = useQuery({
    queryKey: ['redacao-temas'],
    queryFn: fetchRedacaoTemas,
  });

  const [selectedTemaId, setSelectedTemaId] = useState<string | null>(null);
  const selectedTema = (temasRedacao && temasRedacao.length > 0)
    ? (temasRedacao.find((t) => t.id === selectedTemaId) || temasRedacao[0])
    : null;

  const [textoRedacao, setTextoRedacao] = useState('');
  const [bancaRedacao, setBancaRedacao] = useState('Cebraspe');
  const [tipoRedacao, setTipoRedacao] = useState('Dissertação Argumentativa');
  const [resultadoRedacao, setResultadoRedacao] = useState<RedacaoCorrigirResponse | null>(null);


  const redacaoMutation = useMutation({
    mutationFn: corrigirRedacao,
    onSuccess: (data) => {
      setResultadoRedacao(data);
    },
  });

  const handleSubmeterRedacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTema || !textoRedacao.trim() || redacaoMutation.isPending) return;
    redacaoMutation.mutate({
      tema: selectedTema.titulo,
      texto_aluno: textoRedacao,
      banca: bancaRedacao,
      tipo_redacao: tipoRedacao,
    });
  };

  const contagemLinhas = textoRedacao ? textoRedacao.split('\n').length : 0;
  const contagemPalavras = textoRedacao.trim() ? textoRedacao.trim().split(/\s+/).length : 0;

  // ==========================================
  // ESTADO: PSICÓLOGO CONCURSEIRO
  // ==========================================
  const [ansiedadeNivel, setAnsiedadeNivel] = useState(6);
  const [psicologoMensagem, setPsicologoMensagem] = useState('');
  const [psicologoResultado, setPsicologoResultado] = useState<PsicologoConsultaResponse | null>(null);

  const psicologoMutation = useMutation({
    mutationFn: consultarPsicologo,
    onSuccess: (data) => {
      setPsicologoResultado(data);
    },
  });

  const handleConsultarPsicologo = (msgOverride?: string) => {
    const msg = msgOverride || psicologoMensagem;
    if (!msg.trim() || psicologoMutation.isPending) return;
    psicologoMutation.mutate({
      mensagem: msg,
      nivel_ansiedade: ansiedadeNivel,
      contexto_estudo: 'Reta final e preparação avançada para concursos',
    });
  };

  // ==========================================
  // ESTADO: CRONOGRAMA & RANKING
  // ==========================================
  const { data: cronogramaData, isLoading: isLoadingCronograma } = useQuery({
    queryKey: ['cronograma-semanal'],
    queryFn: fetchCronogramaSemanal,
  });

  const { data: rankingData, isLoading: isLoadingRanking } = useQuery({
    queryKey: ['ranking-concorrentes'],
    queryFn: fetchRankingConcorrentes,
  });

  return (
    <div className="space-y-6">
      {/* Banner Superior Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/60 via-surface-900 to-indigo-950/80 border border-purple-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm flex items-center gap-1.5">
                <Sparkles size={12} />
                Mentoria VIP & Alta Performance
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ⭐ Ilimitado Avançado Ativo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-surface-50 tracking-tight">
              Seu Treinamento de Elite para a Aprovação
            </h1>
            <p className="text-sm text-surface-300 max-w-2xl leading-relaxed">
              Treine redações discursivas com correção oficial de banca, organize sua rotina com cronogramas semanais,
              acompanhe sua posição real no ranking e domine a ansiedade com apoio psicológico especializado.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-surface-900/80 border border-surface-700/60 text-center shadow-inner">
              <div className="text-2xl font-black text-amber-400">Top 12%</div>
              <div className="text-[11px] text-surface-400 uppercase tracking-wider font-semibold">Ranking Geral</div>
            </div>
            <div className="p-4 rounded-2xl bg-surface-900/80 border border-surface-700/60 text-center shadow-inner">
              <div className="text-2xl font-black text-emerald-400">24/30</div>
              <div className="text-[11px] text-surface-400 uppercase tracking-wider font-semibold">Média Redação</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação por Sub-Abas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-surface-800 scrollbar-none">
        <button
          onClick={() => setActiveTab('redacao')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'redacao'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
          }`}
        >
          <PenTool size={15} />
          <span>Laboratório de Redação</span>
        </button>

        <button
          onClick={() => setActiveTab('psicologo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'psicologo'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
          }`}
        >
          <Brain size={15} />
          <span>Psicólogo dos Concursos</span>
        </button>

        <button
          onClick={() => setActiveTab('cronograma')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'cronograma'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
          }`}
        >
          <Calendar size={15} />
          <span>Cronograma Semanal</span>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'ranking'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
          }`}
        >
          <Trophy size={15} />
          <span>Ranking de Concorrentes</span>
        </button>

        <button
          onClick={() => setActiveTab('comunidade')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'comunidade'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
          }`}
        >
          <MessageCircle size={15} />
          <span>Mentoria em Grupo WhatsApp</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: LABORATÓRIO DE REDAÇÃO DISCURSIVA */}
      {/* ========================================================================= */}
      {activeTab === 'redacao' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Temas e Instruções */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-surface-200 flex items-center gap-2">
                  <FileText size={16} className="text-purple-400" />
                  Temas Oficiais em Alta
                </h3>
                <span className="text-[11px] text-surface-400">Banco de Temas</span>
              </div>

              {isLoadingTemas ? (
                <div className="flex items-center justify-center p-8 text-surface-400">
                  <Loader2 size={20} className="animate-spin text-purple-400" />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {temasRedacao?.map((tema) => (
                    <button
                      key={tema.id}
                      onClick={() => {
                        setSelectedTemaId(tema.id);
                        setBancaRedacao(tema.banca);
                        setResultadoRedacao(null);
                      }}

                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5 ${
                        selectedTema?.id === tema.id
                          ? 'bg-purple-950/40 border-purple-500/50 text-purple-200 shadow-md'
                          : 'bg-surface-850/60 border-surface-800 text-surface-300 hover:bg-surface-800/80 hover:text-surface-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-surface-400">
                        <span className="px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700">
                          {tema.carreira}
                        </span>
                        <span className="text-purple-300 font-semibold">{tema.banca}</span>
                      </div>
                      <div className="font-bold line-clamp-2 leading-snug">{tema.titulo}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Texto Motivador e Critérios do Tema Selecionado */}
            {selectedTema && (
              <div className="p-5 rounded-2xl bg-surface-900 border border-surface-800 space-y-3">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                  Texto Motivador da Prova
                </span>
                <p className="text-xs text-surface-300 leading-relaxed italic bg-surface-850 p-3 rounded-xl border border-surface-800">
                  "{selectedTema.texto_motivador}"
                </p>
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                    Aspectos a Abordar Obrigatórios:
                  </span>
                  <ul className="space-y-1 text-xs text-surface-300">
                    {selectedTema.criterios.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={13} className="text-purple-400 mt-0.5 shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Espaço de Redação & Correção */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-800">
                <div>
                  <h3 className="text-base font-bold text-surface-100">
                    {selectedTema ? selectedTema.titulo : 'Treinamento de Redação Discursiva'}
                  </h3>
                  <span className="text-xs text-surface-400">
                    Simulação fiel da folha de resposta padrão concurso (até 30 linhas)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={bancaRedacao}
                    onChange={(e) => setBancaRedacao(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-xs font-semibold text-surface-200"
                  >
                    <option value="Cebraspe">Banca Cebraspe</option>
                    <option value="FGV">Banca FGV</option>
                    <option value="FCC">Banca FCC</option>
                    <option value="Vunesp">Banca Vunesp</option>
                    <option value="Cesgranrio">Banca Cesgranrio</option>
                  </select>

                  <select
                    value={tipoRedacao}
                    onChange={(e) => setTipoRedacao(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-xs font-semibold text-surface-200"
                  >
                    <option value="Dissertação Argumentativa">Dissertação Argumentativa</option>
                    <option value="Estudo de Caso / Parecer">Estudo de Caso</option>
                  </select>
                </div>
              </div>

              {/* Área de Digitação com régua e contadores */}
              <form onSubmit={handleSubmeterRedacao} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={textoRedacao}
                    onChange={(e) => setTextoRedacao(e.target.value)}
                    placeholder="Comece a redigir seu texto dissertativo aqui. Estruture em introdução (apresentando a tese), 2 parágrafos de desenvolvimento (fundamentando com leis, súmulas e dados) e 1 parágrafo de conclusão..."
                    className="w-full h-80 p-4 rounded-xl bg-surface-950 border border-surface-700/80 font-mono text-xs sm:text-sm text-surface-100 leading-relaxed placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
                    required
                  />
                  <div className="flex items-center justify-between text-xs text-surface-400 px-1 pt-1">
                    <div className="flex items-center gap-3">
                      <span>Linhas: <strong className={contagemLinhas > 30 ? 'text-rose-400' : 'text-purple-300'}>{contagemLinhas}</strong> / 30</span>
                      <span>Palavras: <strong className="text-surface-200">{contagemPalavras}</strong></span>
                    </div>
                    {contagemLinhas > 30 && (
                      <span className="text-rose-400 font-semibold text-[11px]">
                        ⚠️ Atenção: Limite de 30 linhas ultrapassado na folha definitiva!
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={redacaoMutation.isPending || !textoRedacao.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                  >
                    {redacaoMutation.isPending ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Banca Examinadora Corrigindo Redação...</span>
                      </>
                    ) : (
                      <>
                        <PenTool size={15} />
                        <span>Corrigir com Banca IA (Grade Oficial)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Resultado da Correção */}
            {resultadoRedacao && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-surface-900 border border-purple-500/30 space-y-5 shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-surface-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-black text-lg">
                      {resultadoRedacao.nota_final}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider font-bold text-purple-400">
                        Nota Oficial da Banca ({bancaRedacao})
                      </div>
                      <div className="text-sm font-semibold text-surface-200">
                        {resultadoRedacao.nota_final} de {resultadoRedacao.nota_maxima} pontos possíveis
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <div className="font-bold text-surface-200">{resultadoRedacao.aspectos_macro.apresentacao} / 4.0</div>
                      <div className="text-[10px] text-surface-400">Apresentação</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-surface-200">{resultadoRedacao.aspectos_macro.estrutura} / 6.0</div>
                      <div className="text-[10px] text-surface-400">Estrutura</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-surface-200">{resultadoRedacao.aspectos_macro.conteudo} / 10.0</div>
                      <div className="text-[10px] text-surface-400">Conteúdo & Tese</div>
                    </div>
                  </div>
                </div>

                {/* Parecer da Banca */}
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/25 space-y-2">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Award size={15} />
                    Parecer Geral da Banca Examinadora
                  </span>
                  <p className="text-xs text-surface-200 leading-relaxed">
                    {resultadoRedacao.parecer_banca}
                  </p>
                </div>

                {/* Erros Microestruturais e Dicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-surface-850 border border-surface-800 space-y-2.5">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertCircle size={14} />
                      Apontamentos Gramaticais & Microestrutura
                    </span>
                    {resultadoRedacao.erros_micro?.length > 0 ? (
                      <div className="space-y-2">
                        {resultadoRedacao.erros_micro.map((err, i) => (
                          <div key={i} className="p-2.5 rounded-lg bg-surface-900 border border-surface-750 text-xs">
                            <span className="font-bold text-rose-400">Linha {err.linha} ({err.tipo}): </span>
                            <span className="text-surface-300">{err.descricao}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-surface-400">Nenhum desvio gramatical grave identificado.</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-surface-850 border border-surface-800 space-y-2.5">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Lightbulb size={14} />
                      Dicas de Ouro para a Prova Discursiva
                    </span>
                    <ul className="space-y-1.5 text-xs text-surface-300">
                      {resultadoRedacao.dicas_ouro?.map((dica, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 size={13} className="text-amber-400 mt-0.5 shrink-0" />
                          <span>{dica}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: PSICÓLOGO DOS CONCURSOS (Foco & Ansiedade) */}
      {/* ========================================================================= */}
      {activeTab === 'psicologo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-5 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                  <Brain size={18} className="text-indigo-400" />
                  Psicologia do Estudo & Inteligência Emocional
                </h3>
                <p className="text-xs text-surface-400 leading-relaxed">
                  Concursos de alta concorrência não medem apenas conhecimento, medem controle emocional,
                  resiliência pós-erro e disciplina sob pressão.
                </p>
              </div>

              {/* Termômetro de Ansiedade */}
              <div className="space-y-2 p-4 rounded-xl bg-surface-850 border border-surface-800">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-surface-300">Nível de Ansiedade Atual:</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    ansiedadeNivel >= 8
                      ? 'bg-rose-500/20 text-rose-300'
                      : ansiedadeNivel >= 5
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {ansiedadeNivel} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={ansiedadeNivel}
                  onChange={(e) => setAnsiedadeNivel(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-surface-500 font-mono">
                  <span>1 (Calmo)</span>
                  <span>5 (Alerta)</span>
                  <span>10 (Pânico)</span>
                </div>
              </div>

              {/* Botões de Acesso Rápido a Dores Frequentes */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                  Dúvidas e Situações Comuns:
                </span>
                <div className="flex flex-col gap-1.5">
                  {[
                    'Estou travando na hora do simulado cronometrado por medo do resultado.',
                    'Estou sentindo que não domino nada do edital e bateu síndrome do impostor.',
                    'Procrastinei hoje e estou com sentimento de culpa enorme.',
                    'Fico com medo de errar na prova Cebraspe por conta do fator uma errada anula uma certa.',
                  ].map((queixa, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleConsultarPsicologo(queixa)}
                      disabled={psicologoMutation.isPending}
                      className="text-left p-2.5 rounded-xl bg-surface-850 hover:bg-surface-800 border border-surface-800 text-xs text-surface-300 hover:text-indigo-200 transition-all cursor-pointer"
                    >
                      💬 "{queixa}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                <HeartHandshake size={18} className="text-indigo-400" />
                Sessão com o Psicólogo Virtual
              </h3>

              <div className="space-y-3">
                <textarea
                  value={psicologoMensagem}
                  onChange={(e) => setPsicologoMensagem(e.target.value)}
                  placeholder="Escreva como você está se sentindo hoje: cansaço, medo da concorrência, perda de foco, brancos de memória ou sobrecarga..."
                  className="w-full h-32 p-4 rounded-xl bg-surface-950 border border-surface-700/80 text-xs sm:text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                />

                <div className="flex justify-end">
                  <button
                    onClick={() => handleConsultarPsicologo()}
                    disabled={psicologoMutation.isPending || !psicologoMensagem.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    {psicologoMutation.isPending ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Analisando com Psicologia Cognitiva...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Receber Orientação Psicológica</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Resposta do Psicólogo */}
            {psicologoResultado && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-surface-900 border border-indigo-500/30 space-y-5 shadow-xl"
              >
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/25 space-y-2">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Brain size={15} />
                    Acolhimento & Intervenção Psicológica
                  </span>
                  <p className="text-xs sm:text-sm text-surface-200 leading-relaxed whitespace-pre-wrap">
                    {psicologoResultado.resposta_terapeutica}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-surface-850 border border-surface-800 space-y-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Target size={14} />
                      Técnica: {psicologoResultado.tecnica_sugerida}
                    </span>
                    <ul className="space-y-1.5 text-xs text-surface-300">
                      {psicologoResultado.passos_praticos.map((p, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-850 border border-surface-800 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mb-2">
                        <Sparkles size={14} />
                        Ancoragem Mental Positiva
                      </span>
                      <p className="text-xs sm:text-sm text-surface-200 italic font-medium leading-relaxed">
                        "{psicologoResultado.afirmacao_positiva}"
                      </p>
                    </div>
                    <div className="text-[11px] text-surface-400 mt-4 pt-3 border-t border-surface-800">
                      💡 Repita esta frase antes de iniciar suas sessões de estudo diárias.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CRONOGRAMAS SEMANAIS & TRILHAS DE ESTUDO */}
      {/* ========================================================================= */}
      {activeTab === 'cronograma' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                  <Calendar size={18} className="text-blue-400" />
                  {cronogramaData?.ciclo_nome || 'Ciclo de Estudos Semanal Inteligente'}
                </h3>
                <p className="text-xs text-surface-400">
                  Planejamento baseado na alternância de matérias por peso no edital e curva de esquecimento (Ebbinghaus)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                  {cronogramaData?.horas_semanais || 24} Horas / Semana
                </span>
              </div>
            </div>

            {cronogramaData?.orientacao_especialista && (
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/25 text-xs text-blue-200 flex items-start gap-2.5">
                <Lightbulb size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-300">Diretriz do Mentor Especialista: </strong>
                  <span>{cronogramaData.orientacao_especialista}</span>
                </div>
              </div>
            )}

            {/* Tabela do Cronograma */}
            {isLoadingCronograma ? (
              <div className="flex items-center justify-center p-12 text-surface-400">
                <Loader2 size={24} className="animate-spin text-blue-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {cronogramaData?.dias.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-surface-850/80 border border-surface-800 hover:border-blue-500/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-blue-400">{item.dia_semana}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-surface-800 border border-surface-700 text-surface-300">
                        {item.turno}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-surface-200">{item.disciplina}</div>
                      <div className="text-[11px] text-surface-400 line-clamp-1">{item.topico}</div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-surface-800 text-[11px]">
                      <span className="text-surface-400 font-mono">
                        Meta: <strong className="text-surface-200">{item.meta_questoes} q.</strong>
                      </span>
                      {item.revisao_ativa && (
                        <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Revisão Ativa
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: RANKING DE CONCORRENTES */}
      {/* ========================================================================= */}
      {activeTab === 'ranking' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" />
                  Ranking Geral de Concorrentes em Tempo Real
                </h3>
                <p className="text-xs text-surface-400">
                  Compare seu rendimento real com milhares de alunos que estão disputando as mesmas vagas.
                </p>
              </div>

              {rankingData && (
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Sua Posição: <strong>#{rankingData.posicao_usuario}</strong> de {rankingData.total_concorrentes}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Percentil: <strong>Top {rankingData.percentil_usuario}%</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Tabela de Classificação */}
            {isLoadingRanking ? (
              <div className="flex items-center justify-center p-12 text-surface-400">
                <Loader2 size={24} className="animate-spin text-amber-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-surface-300">
                  <thead className="bg-surface-850 text-surface-400 uppercase text-[10px] tracking-wider border-b border-surface-800">
                    <tr>
                      <th className="py-3 px-4">Posição</th>
                      <th className="py-3 px-4">Candidato</th>
                      <th className="py-3 px-4">Carreira Alvo</th>
                      <th className="py-3 px-4 text-center">Questões Feitas</th>
                      <th className="py-3 px-4 text-center">Taxa de Acerto</th>
                      <th className="py-3 px-4 text-center">Pontos Líquidos</th>
                      <th className="py-3 px-4 text-right">Distinção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800">
                    {rankingData?.ranking.map((u) => (
                      <tr
                        key={u.posicao}
                        className={`transition-colors ${
                          u.is_usuario_atual
                            ? 'bg-amber-500/10 font-bold text-surface-100 border-l-4 border-amber-500'
                            : 'hover:bg-surface-850/50'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold">
                          {u.posicao === 1 ? '🥇 1º' : u.posicao === 2 ? '🥈 2º' : u.posicao === 3 ? '🥉 3º' : `${u.posicao}º`}
                        </td>
                        <td className="py-3.5 px-4 flex items-center gap-2">
                          <span className="text-base">{u.avatar}</span>
                          <span>{u.nome}</span>
                          {u.is_usuario_atual && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500 text-surface-950 font-black">
                              VOCÊ
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-surface-400">{u.carreira}</td>
                        <td className="py-3.5 px-4 text-center font-mono">{u.questoes_feitas}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                          {u.taxa_acerto}%
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-purple-300">
                          {u.pontos_liquidos} pts
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-800 border border-surface-700 text-surface-300">
                            {u.badge}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: MENTORIA COLETIVA & COMUNIDADE WHATSAPP */}
      {/* ========================================================================= */}
      {activeTab === 'comunidade' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <MessageCircle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-surface-100">Grupo VIP de Mentoria no WhatsApp</h3>
              <p className="text-xs text-surface-400 leading-relaxed">
                Tire dúvidas diretamente com os especialistas da banca, receba as análises dos editais recém-publicados
                e saiba em primeira mão qual a melhor ordem de matérias para o seu concurso.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/25 space-y-2 text-xs text-emerald-200">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Vagas exclusivas reservadas para seu perfil Ilimitado
              </div>
              <p className="text-surface-300 text-[11px]">
                Ambiente 100% blindado contra distrações: foco estrito em resoluções, cronogramas e estratégias.
              </p>
            </div>

            <a
              href="https://chat.whatsapp.com/concursos-vip-mentoria"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <MessageCircle size={16} />
              <span>Entrar no Grupo VIP do WhatsApp Agora</span>
            </a>
          </div>

          <div className="p-6 rounded-2xl bg-surface-900 border border-surface-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Calendar size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-surface-100">Calendário de Mentorias Coletivas ao Vivo</h3>
              <p className="text-xs text-surface-400 leading-relaxed">
                Sessões semanais com transmissão ao vivo e análise individual dos cadernos de erros dos alunos.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-surface-850 border border-surface-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-surface-200">Plano de Ataque para Carreiras Policiais & Fiscais</div>
                  <div className="text-[11px] text-surface-400">Técnicas de chute consciente e controle Cebraspe</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-mono font-bold">
                  Quinta, 20h
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-850 border border-surface-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-surface-200">Oficina Prática de Redação Nota Máxima</div>
                  <div className="text-[11px] text-surface-400">Correção comentada ao vivo de 3 redações de alunos</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-mono font-bold">
                  Sábado, 10h
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
