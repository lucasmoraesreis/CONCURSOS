import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  RotateCcw,
  Scale,
  Zap,
  ShieldAlert,
  Copy,
  Check,
  Loader2,
  BookOpen,
  ArrowRight,
  Flame,
  AlertTriangle,
  Lightbulb,
  FileText,
  Bookmark,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchSkillsPresets,
  executarSuperPesquisa,
  executarEngenhariaReversa,
  executarDebateMultiagente,
  executarTokenReducer,
  executarAuditorPegadinha,
} from '../../api/client';
import type {
  SkillPresetItem,
  SuperPesquisaResponse,
  EngenhariaReversaResponse,
  DebateMultiagenteResponse,
  TokenReducerResponse,
  AuditorPegadinhaResponse,
} from '../../types';

type ActiveSkillTab = 'super-pesquisa' | 'engenharia-reversa' | 'debate-multiagente' | 'token-reducer' | 'auditor-pegadinha';

export const SkillsHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveSkillTab>('super-pesquisa');
  const [presets, setPresets] = useState<SkillPresetItem[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados dos formulários de cada skill
  // 1. SuperPesquisa
  const [pesquisaTema, setPesquisaTema] = useState('Responsabilidade Civil Objetiva do Estado e Nexo Causal');
  const [pesquisaBanca, setPesquisaBanca] = useState('Cebraspe');
  const [pesquisaCarreira, setPesquisaCarreira] = useState('Jurídica');
  const [pesquisaResult, setPesquisaResult] = useState<SuperPesquisaResponse | null>(null);
  const [isPesquisando, setIsPesquisando] = useState(false);

  // 2. Engenharia Reversa
  const [reversaEnunciado, setReversaEnunciado] = useState(
    'A Administração Pública pode anular seus próprios atos a qualquer tempo sem qualquer tipo de prazo decadencial ou contraditório prévio, em razão do princípio da autotutela irrestrita.'
  );
  const [reversaBanca, setReversaBanca] = useState('Cebraspe');
  const [reversaGabarito, setReversaGabarito] = useState('Errado');
  const [reversaResult, setReversaResult] = useState<EngenhariaReversaResponse | null>(null);
  const [isReversando, setIsReversando] = useState(false);

  // 3. Debate Multiagente
  const [debateTema, setDebateTema] = useState(
    'É cabível a incidência do princípio da insignificância ao furto qualificado por rompimento de obstáculo ou concurso de pessoas?'
  );
  const [debateBanca, setDebateBanca] = useState('Cebraspe');
  const [debateResult, setDebateResult] = useState<DebateMultiagenteResponse | null>(null);
  const [isDebatendo, setIsDebatendo] = useState(false);

  // 4. Token Reducer
  const [tokenTexto, setTokenTexto] = useState(
    'A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial. É inviolável o sigilo da correspondência e das comunicações telegráficas, de dados e das comunicações telefônicas, salvo, no último caso, por ordem judicial, nas hipóteses e na forma que a lei estabelecer para fins de investigação criminal ou instrução processual penal.'
  );
  const [tokenNivel, setTokenNivel] = useState<'moderado' | 'alto' | 'extremo'>('alto');
  const [tokenResult, setTokenResult] = useState<TokenReducerResponse | null>(null);
  const [isReduzindo, setIsReduzindo] = useState(false);

  // 5. Auditor de Pegadinhas
  const [auditorTexto, setAuditorTexto] = useState(
    'O ato administrativo praticado com desvio de finalidade pode ser convalidado pela autoridade competente a qualquer tempo, desde que demonstrada a ausência de lesão ao erário, prescindindo de oitiva prévia do interessado em qualquer hipótese.'
  );
  const [auditorBanca, setAuditorBanca] = useState('Cebraspe');
  const [auditorResult, setAuditorResult] = useState<AuditorPegadinhaResponse | null>(null);
  const [isAuditando, setIsAuditando] = useState(false);

  // Carregar catálogo de presets
  useEffect(() => {
    async function loadPresets() {
      setIsLoadingPresets(true);
      try {
        const res = await fetchSkillsPresets();
        setPresets(res.presets || []);
      } catch (err) {
        console.error('Erro ao carregar presets das skills:', err);
      } finally {
        setIsLoadingPresets(false);
      }
    }
    loadPresets();
  }, []);

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function aplicarPreset(preset: SkillPresetItem) {
    if (preset.skill_id === 'super-pesquisa') {
      setActiveTab('super-pesquisa');
      const p = preset.payload_exemplo as { tema?: string; banca?: string; carreira?: string };
      if (p.tema) setPesquisaTema(p.tema);
      if (p.banca) setPesquisaBanca(p.banca);
      if (p.carreira) setPesquisaCarreira(p.carreira);
    } else if (preset.skill_id === 'engenharia-reversa') {
      setActiveTab('engenharia-reversa');
      const p = preset.payload_exemplo as { enunciado?: string; banca?: string; gabarito_oficial?: string };
      if (p.enunciado) setReversaEnunciado(p.enunciado);
      if (p.banca) setReversaBanca(p.banca);
      if (p.gabarito_oficial) setReversaGabarito(p.gabarito_oficial);
    } else if (preset.skill_id === 'debate-multiagente') {
      setActiveTab('debate-multiagente');
      const p = preset.payload_exemplo as { tema_ou_questao?: string; banca?: string };
      if (p.tema_ou_questao) setDebateTema(p.tema_ou_questao);
      if (p.banca) setDebateBanca(p.banca);
    } else if (preset.skill_id === 'token-reducer') {
      setActiveTab('token-reducer');
      const p = preset.payload_exemplo as { texto_bruto?: string; nivel_compressao?: 'moderado' | 'alto' | 'extremo' };
      if (p.texto_bruto) setTokenTexto(p.texto_bruto);
      if (p.nivel_compressao) setTokenNivel(p.nivel_compressao);
    } else if (preset.skill_id === 'auditor-pegadinha') {
      setActiveTab('auditor-pegadinha');
      const p = preset.payload_exemplo as { texto_questao?: string; banca?: string };
      if (p.texto_questao) setAuditorTexto(p.texto_questao);
      if (p.banca) setAuditorBanca(p.banca);
    }
  }

  // Executores
  async function handleExecutarPesquisa() {
    if (!pesquisaTema.trim()) return;
    setIsPesquisando(true);
    try {
      const res = await executarSuperPesquisa({
        tema: pesquisaTema,
        banca: pesquisaBanca,
        carreira: pesquisaCarreira,
      });
      setPesquisaResult(res);
    } catch (err) {
      console.error('Erro na pesquisa:', err);
    } finally {
      setIsPesquisando(false);
    }
  }

  async function handleExecutarReversa() {
    if (!reversaEnunciado.trim()) return;
    setIsReversando(true);
    try {
      const res = await executarEngenhariaReversa({
        enunciado: reversaEnunciado,
        banca: reversaBanca,
        gabarito_oficial: reversaGabarito,
      });
      setReversaResult(res);
    } catch (err) {
      console.error('Erro na engenharia reversa:', err);
    } finally {
      setIsReversando(false);
    }
  }

  async function handleExecutarDebate() {
    if (!debateTema.trim()) return;
    setIsDebatendo(true);
    try {
      const res = await executarDebateMultiagente({
        tema_ou_questao: debateTema,
        banca: debateBanca,
      });
      setDebateResult(res);
    } catch (err) {
      console.error('Erro no debate:', err);
    } finally {
      setIsDebatendo(false);
    }
  }

  async function handleExecutarTokenReducer() {
    if (!tokenTexto.trim()) return;
    setIsReduzindo(true);
    try {
      const res = await executarTokenReducer({
        texto_bruto: tokenTexto,
        nivel_compressao: tokenNivel,
      });
      setTokenResult(res);
    } catch (err) {
      console.error('Erro no token reducer:', err);
    } finally {
      setIsReduzindo(false);
    }
  }

  async function handleExecutarAuditor() {
    if (!auditorTexto.trim()) return;
    setIsAuditando(true);
    try {
      const res = await executarAuditorPegadinha({
        texto_questao: auditorTexto,
        banca: auditorBanca,
      });
      setAuditorResult(res);
    } catch (err) {
      console.error('Erro no auditor:', err);
    } finally {
      setIsAuditando(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-surface-900 via-surface-900/90 to-surface-800/80 border border-surface-700/60 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary-500/20 text-primary-300 border border-primary-500/30">
              <Sparkles size={13} className="text-amber-300 animate-pulse" />
              <span>LABORATÓRIO DE SKILLS & MOTORES COGNITIVOS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-50 tracking-tight">
              Central de Skills IA para Concursos Públicos
            </h1>
            <p className="text-sm text-surface-300 leading-relaxed">
              Execute ferramentas táticas especializadas: pesquise jurisprudência profunda, desmonte o DNA de pegadinhas de bancas, 
              simule debates com 3 agentes e reduza leis complexas a mnemônicos de alta fixação.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto shrink-0">
            <div className="p-3 rounded-2xl glass border border-surface-700/50 text-center">
              <span className="text-xs text-surface-400 block font-medium">Skills</span>
              <span className="text-lg font-black text-primary-400">5 Ativas</span>
            </div>
            <div className="p-3 rounded-2xl glass border border-surface-700/50 text-center">
              <span className="text-xs text-surface-400 block font-medium">Bancas</span>
              <span className="text-lg font-black text-emerald-400">Multi-Banca</span>
            </div>
            <div className="p-3 rounded-2xl glass border border-surface-700/50 text-center">
              <span className="text-xs text-surface-400 block font-medium">Segurança</span>
              <span className="text-lg font-black text-purple-400">SecOps</span>
            </div>
            <div className="p-3 rounded-2xl glass border border-surface-700/50 text-center">
              <span className="text-xs text-surface-400 block font-medium">Modo</span>
              <span className="text-lg font-black text-amber-400">100% IA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Presets de Teste Rápido (1-Click) */}
      {presets.length > 0 && (
        <div className="p-4 rounded-2xl glass border border-surface-700/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-surface-300 flex items-center gap-1.5">
              <Lightbulb size={14} className="text-amber-400" />
              Presets Rápidos de Demonstração (Clique para Carregar):
            </span>
            {isLoadingPresets && <Loader2 size={13} className="animate-spin text-surface-400" />}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => aplicarPreset(preset)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold glass border border-surface-700/60 hover:border-primary-500/50 text-surface-200 hover:text-white transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <span className="text-primary-400 font-bold">[{preset.banca}]</span>
                <span>{preset.titulo}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Abas das 5 Skills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full p-1.5 rounded-2xl glass border border-surface-700/60">
        <button
          onClick={() => setActiveTab('super-pesquisa')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'super-pesquisa'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
              : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/40'
          }`}
        >
          <Search size={15} />
          <span>1. SuperAgente de Jurisprudência</span>
        </button>

        <button
          onClick={() => setActiveTab('engenharia-reversa')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'engenharia-reversa'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/40'
          }`}
        >
          <RotateCcw size={15} />
          <span>2. Engenharia Reversa de Questões</span>
        </button>

        <button
          onClick={() => setActiveTab('debate-multiagente')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'debate-multiagente'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/40'
          }`}
        >
          <Scale size={15} />
          <span>3. Tribunal Multiagente em Debate</span>
        </button>

        <button
          onClick={() => setActiveTab('token-reducer')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'token-reducer'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/40'
          }`}
        >
          <Zap size={15} />
          <span>4. Token Reducer Mnemônico</span>
        </button>

        <button
          onClick={() => setActiveTab('auditor-pegadinha')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'auditor-pegadinha'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/40'
          }`}
        >
          <ShieldAlert size={15} />
          <span>5. Auditor Anti-Pegadinhas</span>
        </button>
      </div>

      {/* Conteúdo da Skill 1: SuperAgente de Jurisprudência */}
      {activeTab === 'super-pesquisa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl glass border border-surface-700/60 space-y-4">
              <div className="flex items-center gap-2 text-primary-400 font-bold text-sm">
                <Search size={16} />
                <span>Parâmetros de Pesquisa Profunda</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Tema Jurídico ou Ponto do Edital:</label>
                <textarea
                  value={pesquisaTema}
                  onChange={(e) => setPesquisaTema(e.target.value)}
                  rows={3}
                  placeholder="Ex: Responsabilidade Civil Objetiva do Estado, presunção de legitimidade..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-primary-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Banca Alvo:</label>
                  <select
                    value={pesquisaBanca}
                    onChange={(e) => setPesquisaBanca(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-primary-500"
                  >
                    <option value="Cebraspe">Cebraspe (C/E e Múltipla)</option>
                    <option value="FGV">FGV (Estudos de Caso)</option>
                    <option value="FCC">FCC (Letra da Lei & Súmulas)</option>
                    <option value="Vunesp">Vunesp (Letra da Lei)</option>
                    <option value="Cesgranrio">Cesgranrio</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Carreira / Enfoque:</label>
                  <select
                    value={pesquisaCarreira}
                    onChange={(e) => setPesquisaCarreira(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-primary-500"
                  >
                    <option value="Jurídica">Jurídica (Juiz, MP, Defensor)</option>
                    <option value="Policial">Policial (PF, PRF, PC)</option>
                    <option value="Fiscal / Controle">Fiscal / Controle (TCU, Receita)</option>
                    <option value="Administrativa">Administrativa / Tribunais</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleExecutarPesquisa}
                disabled={isPesquisando || !pesquisaTema.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPesquisando ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Varrendo Súmulas & Doutrina...</span>
                  </>
                ) : (
                  <>
                    <Search size={15} />
                    <span>Executar SuperPesquisa de Jurisprudência</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            {pesquisaResult ? (
              <div className="space-y-4">
                {/* Cabeçalho do Resultado */}
                <div className="p-4 rounded-2xl glass border border-surface-700/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-surface-100">{pesquisaResult.tema}</h3>
                    <span className="text-xs text-primary-400 font-semibold">Banca: {pesquisaResult.banca}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(JSON.stringify(pesquisaResult, null, 2), 'pesquisa')}
                    className="px-3 py-1.5 rounded-lg glass border border-surface-700 text-surface-300 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === 'pesquisa' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedKey === 'pesquisa' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* Súmulas Vinculantes & Tribunais */}
                <div className="p-5 rounded-2xl glass border border-surface-700/60 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <BookOpen size={14} />
                    <span>Súmulas & Teses de Repercussão Geral (STF / STJ)</span>
                  </h4>
                  <ul className="space-y-2">
                    {pesquisaResult.sumulas_stf_stj.map((s, idx) => (
                      <li key={idx} className="p-3 rounded-xl bg-surface-950/60 border border-surface-800 text-xs text-surface-200 leading-relaxed">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Artigos-Chave da Legislação */}
                <div className="p-5 rounded-2xl glass border border-surface-700/60 space-y-2">
                  <h4 className="text-xs font-bold text-primary-400 flex items-center gap-2">
                    <FileText size={14} />
                    <span>Dispositivos Legais e Constitucionais Fundamentais</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {pesquisaResult.artigos_chave.map((art, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-lg bg-surface-900 border border-surface-700 text-xs text-surface-300 font-medium">
                        {art}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Divergência Doutrinária e Padrão da Banca */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl glass border border-surface-700/60 space-y-2">
                    <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Scale size={13} />
                      <span>Divergência Doutrinária</span>
                    </h5>
                    <p className="text-xs text-surface-300 leading-relaxed">{pesquisaResult.divergencia_doutrinaria}</p>
                  </div>

                  <div className="p-4 rounded-2xl glass border border-surface-700/60 space-y-2">
                    <h5 className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Flame size={13} />
                      <span>Como a {pesquisaResult.banca} Cobra</span>
                    </h5>
                    <p className="text-xs text-surface-300 leading-relaxed">{pesquisaResult.padrao_cobranca_banca}</p>
                  </div>
                </div>

                {/* Tabela Mnemônica: Regra vs Exceção */}
                {pesquisaResult.tabela_mnemonica && pesquisaResult.tabela_mnemonica.length > 0 && (
                  <div className="p-5 rounded-2xl glass border border-surface-700/60 space-y-3">
                    <h4 className="text-xs font-bold text-surface-200 flex items-center gap-2">
                      <Bookmark size={14} className="text-amber-400" />
                      <span>Tabela de Alta Retenção: Regra vs Exceção de Prova</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-surface-800 text-surface-400 font-semibold">
                            <th className="pb-2">Conceito</th>
                            <th className="pb-2">Regra Geral</th>
                            <th className="pb-2 text-rose-400">Exceção / Pegadinha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-800/60">
                          {pesquisaResult.tabela_mnemonica.map((item, idx) => (
                            <tr key={idx} className="hover:bg-surface-800/20">
                              <td className="py-2.5 font-bold text-primary-300 pr-3">{item.conceito}</td>
                              <td className="py-2.5 text-surface-300 pr-3">{item.regra}</td>
                              <td className="py-2.5 text-rose-300 font-medium">{item.excecao}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-surface-800 text-center text-surface-500">
                <Search size={36} className="mb-3 opacity-40 text-primary-400" />
                <p className="text-sm font-semibold">Nenhuma pesquisa realizada ainda.</p>
                <p className="text-xs max-w-sm mt-1">
                  Defina o tema e a banca ao lado ou clique em um dos presets rápidos acima para ver a varredura completa.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Skill 2: Engenharia Reversa */}
      {activeTab === 'engenharia-reversa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl glass border border-surface-700/60 space-y-4">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <RotateCcw size={16} />
                <span>Desmontador de Questões da Banca</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Cole o Enunciado da Questão:</label>
                <textarea
                  value={reversaEnunciado}
                  onChange={(e) => setReversaEnunciado(e.target.value)}
                  rows={5}
                  placeholder="Cole aqui a questão que você errou ou achou capciosa..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-purple-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Banca:</label>
                  <select
                    value={reversaBanca}
                    onChange={(e) => setReversaBanca(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="Cebraspe">Cebraspe</option>
                    <option value="FGV">FGV</option>
                    <option value="FCC">FCC</option>
                    <option value="Vunesp">Vunesp</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-surface-300">Gabarito Oficial:</label>
                  <input
                    type="text"
                    value={reversaGabarito}
                    onChange={(e) => setReversaGabarito(e.target.value)}
                    placeholder="Ex: Certo, Errado, B"
                    className="w-full px-3 py-2 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <button
                onClick={handleExecutarReversa}
                disabled={isReversando || !reversaEnunciado.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isReversando ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Decodificando DNA da Banca...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={15} />
                    <span>Fazer Engenharia Reversa & Gerar Clones</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            {reversaResult ? (
              <div className="space-y-4">
                {/* Painel do DNA da Pegadinha */}
                <div className="p-5 rounded-2xl glass border border-purple-500/40 space-y-3 bg-purple-950/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-2">
                      <Flame size={14} className="text-purple-400" />
                      DNA da Pegadinha & Complexidade (Bloom)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {reversaResult.nivel_bloom}
                    </span>
                  </div>

                  <p className="text-xs text-surface-200 leading-relaxed">{reversaResult.dna_pegadinha}</p>

                  <div className="p-3 rounded-xl bg-surface-950/80 border border-surface-800 text-xs font-mono text-purple-300">
                    <span className="text-surface-400 block mb-1 text-[11px] font-sans">Fórmula Lógica do Examinador:</span>
                    {reversaResult.formula_examinador}
                  </div>
                </div>

                {/* Distratores e Falácias */}
                {reversaResult.analise_distratores && reversaResult.analise_distratores.length > 0 && (
                  <div className="p-5 rounded-2xl glass border border-surface-700/60 space-y-2">
                    <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      <span>Análise de Distratores (Truques Mentais)</span>
                    </h4>
                    <div className="space-y-2">
                      {reversaResult.analise_distratores.map((dist, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-surface-950/50 border border-surface-800 text-xs flex items-start gap-2">
                          <span className="font-bold text-amber-300 shrink-0">{dist.opcao}:</span>
                          <span className="text-surface-300">{dist.falacia_empregada}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questões Clones Geradas para Fixação */}
                {reversaResult.questoes_clones && reversaResult.questoes_clones.length > 0 && (
                  <div className="p-5 rounded-2xl glass border border-surface-700/60 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                      <Sparkles size={14} />
                      <span>Questões Clones Inéditas Geradas para Fixação</span>
                    </h4>

                    {reversaResult.questoes_clones.map((clone, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-surface-950/70 border border-surface-800 space-y-3">
                        <p className="text-xs text-surface-100 font-medium leading-relaxed">{clone.enunciado}</p>

                        <div className="space-y-1.5 pl-2">
                          {clone.alternativas.map((alt) => (
                            <div
                              key={alt.letra}
                              className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                                alt.letra === clone.alternativa_correta
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold'
                                  : 'text-surface-400'
                              }`}
                            >
                              <span className="w-5 font-bold shrink-0">{alt.letra})</span>
                              <span>{alt.texto}</span>
                            </div>
                          ))}
                        </div>

                        <div className="p-3 rounded-lg bg-surface-900/60 text-xs text-surface-300 border-l-2 border-emerald-500">
                          <span className="font-bold text-emerald-400">Gabarito: {clone.alternativa_correta}</span> — {clone.explicacao}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-surface-800 text-center text-surface-500">
                <RotateCcw size={36} className="mb-3 opacity-40 text-purple-400" />
                <p className="text-sm font-semibold">Nenhuma engenharia reversa ativa.</p>
                <p className="text-xs max-w-sm mt-1">
                  Cole uma questão difícil ao lado para decodificar o truque do examinador e treinar com questões clones.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Skill 3: Tribunal Multiagente em Debate */}
      {activeTab === 'debate-multiagente' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl glass border border-surface-700/60 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Scale size={16} />
                <span>Mesa Redonda Multiagente em Debate</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Tese ou Ponto Controverso:</label>
                <textarea
                  value={debateTema}
                  onChange={(e) => setDebateTema(e.target.value)}
                  rows={4}
                  placeholder="Ex: Aplicação do princípio da insignificância ao furto qualificado..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Banca Examinadora:</label>
                <select
                  value={debateBanca}
                  onChange={(e) => setDebateBanca(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="Cebraspe">Cebraspe</option>
                  <option value="FGV">FGV</option>
                  <option value="FCC">FCC</option>
                  <option value="Vunesp">Vunesp</option>
                </select>
              </div>

              <button
                onClick={handleExecutarDebate}
                disabled={isDebatendo || !debateTema.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDebatendo ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Confrontando os 3 Agentes...</span>
                  </>
                ) : (
                  <>
                    <Scale size={15} />
                    <span>Iniciar Debate Multiagente em Rodadas</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            {debateResult ? (
              <div className="space-y-4">
                {/* 3 Agentes Especialistas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-2">
                    <span className="text-[11px] font-bold text-blue-400 block uppercase">Agente 1 • Lei Seca</span>
                    <p className="text-xs text-surface-300 leading-relaxed">{debateResult.agente_lei_seca}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-400 block uppercase">Agente 2 • Tribunais (STF/STJ)</span>
                    <p className="text-xs text-surface-300 leading-relaxed">{debateResult.agente_tribunais}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                    <span className="text-[11px] font-bold text-purple-400 block uppercase">Agente 3 • Doutrina</span>
                    <p className="text-xs text-surface-300 leading-relaxed">{debateResult.agente_doutrina}</p>
                  </div>
                </div>

                {/* Réplica / Ponto de Colisão */}
                <div className="p-4 rounded-2xl glass border border-amber-500/40 bg-amber-950/10 space-y-1.5">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Flame size={13} />
                    Colisão e Réplica entre os Especialistas
                  </span>
                  <p className="text-xs text-surface-200 leading-relaxed">{debateResult.replica_debate}</p>
                </div>

                {/* Veredito Oficial do Relator */}
                <div className="p-5 rounded-2xl glass border border-emerald-500/60 bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={15} />
                      Veredito Oficial do Relator da Comissão ({debateResult.banca})
                    </span>
                  </div>
                  <p className="text-xs text-surface-100 leading-relaxed font-medium">{debateResult.veredito_relator}</p>

                  <div className="p-3 rounded-xl bg-surface-950/80 border border-surface-800 space-y-1">
                    <span className="text-[11px] text-surface-400 block font-semibold">Gabarito Recomendado para a Prova:</span>
                    <p className="text-xs font-bold text-emerald-400">{debateResult.gabarito_recomendado}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                    <Lightbulb size={14} className="shrink-0 mt-0.5" />
                    <span>{debateResult.dica_antidoto}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-surface-800 text-center text-surface-500">
                <Scale size={36} className="mb-3 opacity-40 text-emerald-400" />
                <p className="text-sm font-semibold">Nenhum debate em andamento.</p>
                <p className="text-xs max-w-sm mt-1">
                  Submeta uma controvérsia para ver os 3 agentes duelando até o consenso final do Relator.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Skill 4: Token Reducer Neural */}
      {activeTab === 'token-reducer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl glass border border-surface-700/60 space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Zap size={16} />
                <span>Compressor Mnemônico Neural</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Cole a Lei Seca ou Texto Denso:</label>
                <textarea
                  value={tokenTexto}
                  onChange={(e) => setTokenTexto(e.target.value)}
                  rows={6}
                  placeholder="Cole aqui artigos longos, trechos de apostilas, jurisprudência..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-amber-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Nível de Redução de Tokens:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['moderado', 'alto', 'extremo'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setTokenNivel(lvl)}
                      className={`py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        tokenNivel === lvl
                          ? 'bg-amber-500 text-surface-950 font-black shadow-md shadow-amber-500/30'
                          : 'glass border border-surface-700 text-surface-300 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleExecutarTokenReducer}
                disabled={isReduzindo || !tokenTexto.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-surface-950 font-black text-xs shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isReduzindo ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-surface-950" />
                    <span>Comprimindo e Gerando Mnemônicos...</span>
                  </>
                ) : (
                  <>
                    <Zap size={15} />
                    <span>Reduzir Tokens & Extrair Mnemônicos</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            {tokenResult ? (
              <div className="space-y-4">
                {/* Métricas de Economia */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl glass border border-surface-700/60 text-center">
                    <span className="text-[11px] text-surface-400 block font-semibold">Tokens Originais</span>
                    <span className="text-base font-black text-surface-200">~{tokenResult.tokens_originais_est}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl glass border border-surface-700/60 text-center">
                    <span className="text-[11px] text-surface-400 block font-semibold">Tokens Comprimidos</span>
                    <span className="text-base font-black text-amber-400">~{tokenResult.tokens_comprimidos_est}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                    <span className="text-[11px] text-emerald-400 block font-bold">Economia Cognitiva</span>
                    <span className="text-base font-black text-emerald-300">-{tokenResult.taxa_reducao_percent}%</span>
                  </div>
                </div>

                {/* Resumo Ultra-Denso */}
                <div className="p-5 rounded-2xl glass border border-amber-500/40 space-y-2">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Zap size={14} />
                    <span>Resumo de Altíssimo Rendimento (Densidade Máxima)</span>
                  </h4>
                  <p className="text-xs text-surface-100 leading-relaxed whitespace-pre-line font-medium">
                    {tokenResult.resumo_ultra_denso}
                  </p>
                </div>

                {/* Mnemônicos Criados */}
                {tokenResult.mnemonicos && tokenResult.mnemonicos.length > 0 && (
                  <div className="p-5 rounded-2xl glass border border-surface-700/60 space-y-2">
                    <h4 className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <Sparkles size={14} />
                      <span>Gatilhos Mnemônicos Criados para Fixação</span>
                    </h4>
                    <div className="space-y-1.5">
                      {tokenResult.mnemonicos.map((mn, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs font-bold text-purple-200">
                          {mn}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regras e Prazos Chave */}
                {tokenResult.regras_e_prazos_chave && tokenResult.regras_e_prazos_chave.length > 0 && (
                  <div className="p-5 rounded-2xl glass border border-surface-700/60 space-y-2">
                    <h4 className="text-xs font-bold text-surface-200 flex items-center gap-1.5">
                      <Bookmark size={14} className="text-emerald-400" />
                      <span>Regras e Prazos Obrigatórios de Prova</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tokenResult.regras_e_prazos_chave.map((r, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-surface-950/60 border border-surface-800 text-xs">
                          <span className="font-bold text-primary-300 block mb-0.5">{r.item}</span>
                          <span className="text-surface-300">{r.detalhe}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-surface-800 text-center text-surface-500">
                <Zap size={36} className="mb-3 opacity-40 text-amber-400" />
                <p className="text-sm font-semibold">Nenhum texto compactado ainda.</p>
                <p className="text-xs max-w-sm mt-1">
                  Cole artigos de leis longas para remover a gordura lexical e extrair mnemônicos visuais instantâneos.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Skill 5: Auditor Anti-Pegadinhas */}
      {activeTab === 'auditor-pegadinha' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl glass border border-surface-700/60 space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <ShieldAlert size={16} />
                <span>Auditor Anti-Pegadinhas & Cascas de Banana</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Cole a Assertiva ou Item de Questão:</label>
                <textarea
                  value={auditorTexto}
                  onChange={(e) => setAuditorTexto(e.target.value)}
                  rows={5}
                  placeholder="Cole aqui a assertiva para verificar se há pegadinha embutida..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-rose-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-300">Banca Examinadora:</label>
                <select
                  value={auditorBanca}
                  onChange={(e) => setAuditorBanca(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-950/70 border border-surface-700 text-surface-100 text-xs focus:outline-none focus:border-rose-500"
                >
                  <option value="Cebraspe">Cebraspe</option>
                  <option value="FGV">FGV</option>
                  <option value="FCC">FCC</option>
                  <option value="Vunesp">Vunesp</option>
                </select>
              </div>

              <button
                onClick={handleExecutarAuditor}
                disabled={isAuditando || !auditorTexto.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAuditando ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Auditando Palavras de Risco...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={15} />
                    <span>Auditar Assertiva & Extrair Antídoto</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            {auditorResult ? (
              <div className="space-y-4">
                {/* Termômetro de Risco */}
                <div className="p-5 rounded-2xl glass border border-rose-500/40 bg-rose-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-2">
                      <AlertTriangle size={15} />
                      Índice de Periculosidade da Pegadinha
                    </span>
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black ${
                        auditorResult.classificacao_risco === 'Crítico'
                          ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                          : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                      }`}
                    >
                      Risco {auditorResult.classificacao_risco} ({auditorResult.indice_periculosidade}/100)
                    </span>
                  </div>

                  {/* Barra de progresso */}
                  <div className="w-full h-3 rounded-full bg-surface-950 overflow-hidden border border-surface-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        auditorResult.indice_periculosidade >= 70
                          ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                          : 'bg-gradient-to-r from-emerald-500 to-amber-500'
                      }`}
                      style={{ width: `${auditorResult.indice_periculosidade}%` }}
                    />
                  </div>

                  {/* Termos Suspeitos Detectados */}
                  {auditorResult.termos_suspeitos_detectados.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] text-surface-400 block mb-1.5 font-semibold">Termos Gatilho Identificados:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {auditorResult.termos_suspeitos_detectados.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold font-mono"
                          >
                            ⚠️ "{t}"
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Armadilhas Identificadas */}
                <div className="p-5 rounded-2xl glass border border-surface-700/60 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Flame size={14} />
                    <span>Armadilhas Identificadas pelo Firewall Cognitivo</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {auditorResult.armadilhas_identificadas.map((arm, idx) => (
                      <li key={idx} className="p-2.5 rounded-xl bg-surface-950/60 border border-surface-800 text-xs text-surface-200 flex items-start gap-2">
                        <ArrowRight size={13} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>{arm}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Antídoto do Aluno */}
                <div className="p-5 rounded-2xl glass border border-emerald-500/50 bg-emerald-950/15 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Lightbulb size={15} />
                    <span>Antídoto do Aprovado para a Prova</span>
                  </h4>
                  <p className="text-xs text-surface-100 font-semibold leading-relaxed">
                    {auditorResult.antidoto_candidato}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-surface-800 text-center text-surface-500">
                <ShieldAlert size={36} className="mb-3 opacity-40 text-rose-400" />
                <p className="text-sm font-semibold">Nenhuma auditoria realizada.</p>
                <p className="text-xs max-w-sm mt-1">
                  Cole uma assertiva capciosa para auditar termos absolutistas e ver se ela é uma casca de banana.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsHubView;
