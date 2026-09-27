/**
 * GeneratorModal — Modal do Gerador de Questões Inéditas ("Hacker de Bancas")
 *
 * Permite ao concurseiro configurar banca, disciplina, assunto, dificuldade e provedor.
 * Ao clicar "Gerar", navega para a página dedicada de questões geradas.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Sparkles, Wand2, Bot, Zap,
} from 'lucide-react';
import { useGeneratorStore } from '../../stores/generatorStore';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function GeneratorModal({ isOpen, onClose }: GeneratorModalProps) {
  const [banca, setBanca] = useState('Cebraspe');
  const [disciplina, setDisciplina] = useState('Direito Constitucional');
  const [assunto, setAssunto] = useState('Artigo 5º - Direitos e Garantias Fundamentais');
  const [tipoQuestao, setTipoQuestao] = useState('Certo/Errado');
  const [dificuldade, setDificuldade] = useState('Difícil');
  const [provider, setProvider] = useState('auto');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigateToGenerator = useGeneratorStore((s) => s.navigateToGenerator);

  // Auto-ajustar formato ao mudar para Cebraspe
  function handleBancaChange(newBanca: string) {
    setBanca(newBanca);
    if (newBanca === 'Cebraspe') {
      setTipoQuestao('Certo/Errado');
    } else if (tipoQuestao === 'Certo/Errado') {
      setTipoQuestao('Múltipla Escolha');
    }
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!disciplina.trim() || !assunto.trim()) {
      setErrorMsg('Por favor preencha a disciplina e o assunto.');
      return;
    }

    setErrorMsg(null);

    // Navegar para a página de questões geradas com as configs
    navigateToGenerator({
      banca,
      disciplina: disciplina.trim(),
      assunto: assunto.trim(),
      tipoQuestao,
      dificuldade,
      provider,
    });

    onClose();
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
            {/* Seletor de IA com Failover Automático */}
            <div className="p-4 rounded-2xl bg-surface-800/50 border border-surface-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-surface-200 uppercase tracking-wider">
                      Modelo / Provedor de IA
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Cascata & Failover Ativos
                    </span>
                  </div>
                  <p className="text-[11px] text-surface-400 mt-0.5">
                    Troca automática instantânea caso um provedor atinja limite (429) ou instabilidade (503)
                  </p>
                </div>
              </div>
              <div className="sm:w-80 shrink-0">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass text-xs font-semibold text-surface-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                >
                  <option value="auto" className="bg-surface-800 text-surface-100 font-medium">
                    🤖 Auto (Cascata com Failover Inteligente)
                  </option>
                  <option value="openrouter" className="bg-surface-800 text-surface-100 font-medium">
                    ⚡ OpenRouter (OpenAI GPT-4o Mini)
                  </option>
                  <option value="gemini" className="bg-surface-800 text-surface-100 font-medium">
                    ✨ Google Gemini (Gemini 3.6 Flash)
                  </option>
                  <option value="groq" className="bg-surface-800 text-surface-100 font-medium">
                    🚀 Groq (Qwen 3.8 27B / Ultra-Rápido)
                  </option>
                  <option value="cloudflare" className="bg-surface-800 text-surface-100 font-medium">
                    ☁️ Cloudflare Workers AI
                  </option>
                  <option value="simulado" className="bg-surface-800 text-surface-100 font-medium">
                    🛡️ Matriz Hacker (Modo Offline Simulado)
                  </option>
                </select>
              </div>
            </div>

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

            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Info box sobre o novo fluxo */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
              <Zap size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-indigo-300">Geração em Lote</p>
                <p className="text-[11px] text-surface-400 mt-0.5">
                  Ao clicar em "Gerar", você será redirecionado para uma página dedicada com <strong className="text-surface-200">5 questões</strong> geradas instantaneamente pela IA. 
                  No final, clique para gerar mais 5 — quantas vezes quiser!
                </p>
              </div>
            </div>

            {/* Botão de Gerar */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-primary-600 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 hover:opacity-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wand2 size={18} />
                <span>Gerar 5 Questões Inéditas</span>
                <Sparkles size={16} className="text-purple-200" />
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
