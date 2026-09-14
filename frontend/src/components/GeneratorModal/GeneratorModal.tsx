/**
 * GeneratorModal — Modal do Gerador de Questões Inéditas ("Hacker de Bancas")
 *
 * Permite ao concurseiro forjar questões inéditas simulando o estilo e as pegadinhas
 * das bancas mais disputadas do Brasil (Cebraspe, FGV, FCC, IADES, Quadrix).
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Sparkles, Wand2, Loader2, CheckCircle2, AlertTriangle, Lightbulb
} from 'lucide-react';
import { gerarQuestaoInedita } from '../../api/client';
import type { Questao, QuestaoGeradaResponse } from '../../types';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionGenerated?: (questao: Questao) => void;
}

const BANCAS = ['Cebraspe', 'FGV', 'FCC', 'IADES', 'Quadrix'];
const DIFICULDADES = ['Médio', 'Difícil', 'Nível Perito'];

const SUGESTOES_DISCIPLINAS = [
  { disciplina: 'Direito Constitucional', assunto: 'Artigo 5º - Direitos e Garantias Fundamentais' },
  { disciplina: 'Direito Administrativo', assunto: 'Atos Administrativos e Poder de Polícia' },
  { disciplina: 'Legislação do DF', assunto: 'Lei Complementar nº 840/2011 (Regime Jurídico dos Servidores do DF)' },
  { disciplina: 'Legislação do DF', assunto: 'Lei Orgânica do Distrito Federal (LODF) - Da Organização dos Poderes' },
  { disciplina: 'Língua Portuguesa', assunto: 'Crase e Regência Verbal em Textos Complexos' },
  { disciplina: 'Direito Penal', assunto: 'Crimes Contra a Administração Pública' },
];

export function GeneratorModal({ isOpen, onClose, onQuestionGenerated }: GeneratorModalProps) {
  const [banca, setBanca] = useState('Cebraspe');
  const [disciplina, setDisciplina] = useState('Direito Constitucional');
  const [assunto, setAssunto] = useState('Artigo 5º - Direitos e Garantias Fundamentais');
  const [tipoQuestao, setTipoQuestao] = useState('Certo/Errado');
  const [dificuldade, setDificuldade] = useState('Difícil');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [result, setResult] = useState<QuestaoGeradaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados de resposta interativa da questão gerada
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showPegadinha, setShowPegadinha] = useState(false);
  const [showJustificativa, setShowJustificativa] = useState(false);

  // Auto-ajustar formato ao mudar para Cebraspe
  function handleBancaChange(newBanca: string) {
    setBanca(newBanca);
    if (newBanca === 'Cebraspe') {
      setTipoQuestao('Certo/Errado');
    } else if (tipoQuestao === 'Certo/Errado') {
      setTipoQuestao('Múltipla Escolha');
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!disciplina.trim() || !assunto.trim()) {
      setError('Por favor preencha a disciplina e o assunto.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setResult(null);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setShowPegadinha(false);
    setShowJustificativa(false);

    setGenerationStep('Mapeando matriz de pegadinhas da banca...');

    const timer1 = setTimeout(() => {
      setGenerationStep('Engenhando distratores cognitivos com IA...');
    }, 1800);

    const timer2 = setTimeout(() => {
      setGenerationStep('Calculando vetor de embedding e persistindo no banco...');
    }, 4000);

    try {
      const data = await gerarQuestaoInedita({
        banca,
        disciplina,
        assunto,
        tipo_questao: tipoQuestao,
        dificuldade,
      });

      setResult(data);

      // Converte para formato Questao e notifica parent
      if (onQuestionGenerated) {
        const questaoFormatada: Questao = {
          id: data.id || `inedita-${Date.now()}`,
          numero_questao: 1,
          tipo_questao: data.tipo_questao,
          enunciado: data.enunciado,
          alternativa_correta: data.alternativa_correta,
          justificativa_ia: data.justificativa_ia,
          alternativas: data.alternativas.map((alt, idx) => ({
            id: `alt-${idx}`,
            letra: alt.letra,
            texto: alt.texto,
            is_correta: alt.letra === data.alternativa_correta,
          })),
          disciplina_nome: data.disciplina,
          assunto_nome: data.assunto,
          concurso_orgao: 'Simulado Hacker de Bancas',
          concurso_cargo: 'Questão Inédita',
          concurso_ano: 2026,
          banca_nome: data.banca_emulada,
          is_inedita: true,
          engenharia_da_pegadinha: data.engenharia_da_pegadinha,
        };
        onQuestionGenerated(questaoFormatada);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao comunicar com a IA. Verifique sua chave de API.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsGenerating(false);
      setGenerationStep('');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl bg-surface-900 border border-surface-700/60 rounded-3xl shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 sm:px-8 py-6 border-b border-surface-800 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-surface-900 to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-surface-100">
                  Hacker de Bancas
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Gerador de Inéditas IA
                </span>
              </div>
              <p className="text-xs text-surface-400 mt-0.5">
                Engenharia reversa de armadilhas das bancas para treinamento de elite
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl glass text-surface-400 hover:text-surface-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto space-y-6">
          {/* Formulário de Configuração */}
          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Banca */}
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                  Banca Organizadora
                </label>
                <select
                  value={banca}
                  onChange={(e) => handleBancaChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {BANCAS.map((b) => (
                    <option key={b} value={b} className="bg-surface-800 text-surface-100">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Formato */}
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                  Formato da Questão
                </label>
                <select
                  value={tipoQuestao}
                  onChange={(e) => setTipoQuestao(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="Múltipla Escolha" className="bg-surface-800">
                    Múltipla Escolha (A-E)
                  </option>
                  <option value="Certo/Errado" className="bg-surface-800">
                    Certo/Errado (Estilo Cebraspe)
                  </option>
                </select>
              </div>

              {/* Dificuldade */}
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                  Nível de Dificuldade
                </label>
                <select
                  value={dificuldade}
                  onChange={(e) => setDificuldade(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  {DIFICULDADES.map((d) => (
                    <option key={d} value={d} className="bg-surface-800">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Disciplina e Assunto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                  Disciplina
                </label>
                <input
                  type="text"
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  placeholder="Ex: Direito Constitucional, Legislação do DF..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5 uppercase tracking-wider">
                  Assunto / Tema Específico
                </label>
                <input
                  type="text"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder="Ex: Artigo 5º, Inquérito Policial, LC 840/2011..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>

            {/* Sugestões Rápidas */}
            <div>
              <span className="text-xs text-surface-400 font-medium">Sugestões de temas quentes: </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {SUGESTOES_DISCIPLINAS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDisciplina(s.disciplina);
                      setAssunto(s.assunto);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-surface-800/80 hover:bg-surface-700 text-xs text-surface-300 hover:text-surface-100 border border-surface-700/50 transition-colors"
                  >
                    {s.assunto.split(' - ')[0]} ({s.disciplina})
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botão de Gerar */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-primary-600 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 hover:opacity-95 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{generationStep || 'Forjando Questão...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={18} />
                    <span>Gerar Questão Inédita com Pegadinha</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Questão Gerada com Interatividade */}
          {result && (
            <div className="mt-8 pt-8 border-t border-surface-800 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    Questão Forjada com Sucesso
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-800 text-xs text-surface-300">
                    Banca: {result.banca_emulada}
                  </span>
                </div>
              </div>

              {/* Card da Questão */}
              <div className="p-6 rounded-2xl bg-surface-800/40 border border-surface-700/50 space-y-4">
                <p className="text-sm sm:text-base leading-relaxed text-surface-100 whitespace-pre-wrap font-medium">
                  {result.enunciado}
                </p>

                {/* Alternativas */}
                <div className="space-y-2 pt-2">
                  {result.alternativas.map((alt: { letra: string; texto: string }) => {
                    const isSelected = selectedAnswer === alt.letra;
                    const isCorrect = alt.letra === result.alternativa_correta;

                    let btnClass = 'border-surface-700/50 hover:border-surface-600 hover:bg-surface-700/30 text-surface-200';
                    if (showAnswer) {
                      if (isCorrect) btnClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-200';
                      else if (isSelected) btnClass = 'border-red-500 bg-red-500/10 text-red-200';
                      else btnClass = 'border-surface-800 opacity-50 text-surface-400';
                    } else if (isSelected) {
                      btnClass = 'border-purple-500 bg-purple-500/10 text-purple-200';
                    }

                    return (
                      <button
                        key={alt.letra}
                        onClick={() => {
                          if (showAnswer) return;
                          setSelectedAnswer(alt.letra);
                          setShowAnswer(true);
                        }}
                        disabled={showAnswer}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-start gap-3 ${btnClass}`}
                      >
                        <span className="shrink-0 w-7 h-7 rounded-lg bg-surface-700/60 flex items-center justify-center text-xs font-bold">
                          {alt.letra}
                        </span>
                        <span className="text-sm pt-0.5 leading-relaxed">{alt.texto}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback e Botões de Revelação */}
                {showAnswer && (
                  <div className="space-y-3 pt-4">
                    <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
                      selectedAnswer === result.alternativa_correta
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/10 border border-red-500/20 text-red-300'
                    }`}>
                      <CheckCircle2 size={18} />
                      {selectedAnswer === result.alternativa_correta
                        ? 'Sensacional! Você não caiu na pegadinha da banca!'
                        : `Você caiu na armadilha da banca! Gabarito: ${result.alternativa_correta}`
                      }
                    </div>

                    {/* Revelar Pegadinha */}
                    <button
                      onClick={() => setShowPegadinha(!showPegadinha)}
                      className="w-full text-left p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-300 text-sm font-medium flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Análise da Banca & Engenharia da Pegadinha
                      </span>
                      <span>{showPegadinha ? '▲ Ocultar' : '▼ Revelar Segredo'}</span>
                    </button>

                    {showPegadinha && (
                      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs sm:text-sm text-surface-200 leading-relaxed whitespace-pre-wrap">
                        {result.engenharia_da_pegadinha}
                      </div>
                    )}

                    {/* Revelar Justificativa */}
                    <button
                      onClick={() => setShowJustificativa(!showJustificativa)}
                      className="w-full text-left p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-medium flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Lightbulb size={16} />
                        Justificativa Jurídica / Teórica
                      </span>
                      <span>{showJustificativa ? '▲ Ocultar' : '▼ Revelar'}</span>
                    </button>

                    {showJustificativa && (
                      <div className="p-4 rounded-xl bg-surface-900 border border-surface-700/50 text-xs sm:text-sm text-surface-300 leading-relaxed whitespace-pre-wrap">
                        {result.justificativa_ia}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
