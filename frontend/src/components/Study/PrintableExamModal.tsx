/**
 * PrintableExamModal.tsx — Caderno de Prova Imprimível / Exportador de PDF Multi-Banca
 *
 * Diagramação oficial de concurso público:
 * - Cabeçalho oficial com banca, órgão, cargo e instruções
 * - Diagramação limpa em 2 colunas com tipografia de alta legibilidade
 * - Cartão-Resposta Oficial destacável ao final (grade de bolinhas A-E ou C/E)
 * - Gabarito e Justificativa comentada destacável
 * - Suporte a window.print() para salvar como PDF vetorial nativo
 */

import { useState } from 'react';
import { Printer, X, Download } from 'lucide-react';
import type { Questao } from '../../types';

interface PrintableExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  questoes: Questao[];
  tituloSimulado?: string;
  bancaNome?: string;
  orgaoNome?: string;
  cargoNome?: string;
}

export function PrintableExamModal({
  isOpen,
  onClose,
  questoes,
  tituloSimulado = 'Simulado Oficial Multi-Banca',
  bancaNome = 'Banca Examinadora Oficial',
  orgaoNome = 'Concurso Público Nacional',
  cargoNome = 'Cargo Específico',
}: PrintableExamModalProps) {
  const [showGabarito, setShowGabarito] = useState<boolean>(true);
  const [showJustificativas, setShowJustificativas] = useState<boolean>(false);

  if (!isOpen) return null;

  function handlePrint() {
    window.print();
  }

  // Detecta se a prova é predominantemente Certo/Errado (Cebraspe/Quadrix)
  const isCertoErrado = questoes.some(
    (q) => q.tipo_questao?.toLowerCase().includes('certo') || q.alternativas.length === 2
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-5xl bg-surface-900 border border-surface-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none print:w-full print:bg-white text-surface-100 print:text-black">
        {/* Barra Superior de Controle (Oculta na Impressão) */}
        <div className="p-4 sm:p-6 border-b border-surface-800 bg-surface-950/80 flex flex-wrap items-center justify-between gap-4 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary-500/20 text-primary-400">
              <Printer size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-surface-100">
                Caderno de Prova Imprimível (PDF)
              </h3>
              <p className="text-xs text-surface-400">
                {questoes.length} questões diagramadas • {bancaNome}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-surface-300 cursor-pointer select-none bg-surface-800/80 px-3 py-2 rounded-xl border border-surface-700">
              <input
                type="checkbox"
                checked={showGabarito}
                onChange={(e) => setShowGabarito(e.target.checked)}
                className="rounded accent-primary-500"
              />
              <span>Folha de Respostas / Gabarito</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-surface-300 cursor-pointer select-none bg-surface-800/80 px-3 py-2 rounded-xl border border-surface-700">
              <input
                type="checkbox"
                checked={showJustificativas}
                onChange={(e) => setShowJustificativas(e.target.checked)}
                className="rounded accent-primary-500"
              />
              <span>Justificativa Comentada</span>
            </label>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-primary-600/30 cursor-pointer"
            >
              <Download size={14} />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-surface-800 text-surface-400 hover:text-white transition-all cursor-pointer"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Visualização da Folha de Prova Oficial (Estilizada para Impressão) */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-8 bg-slate-950/60 print:bg-white print:p-8 font-serif leading-relaxed text-sm text-slate-200 print:text-black">
          {/* Cabeçalho Oficial do Concurso */}
          <div className="border-2 border-slate-700 print:border-black p-6 rounded-2xl print:rounded-none space-y-3 text-center bg-slate-900/80 print:bg-white">
            <div className="text-xs uppercase font-sans tracking-widest text-slate-400 print:text-gray-600 font-bold">
              {bancaNome}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-white print:text-black uppercase">
              {orgaoNome}
            </h1>
            <div className="text-sm font-sans font-semibold text-primary-400 print:text-black">
              CARGO: {cargoNome.toUpperCase()}
            </div>
            <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-700 print:border-black text-xs font-sans text-slate-400 print:text-gray-700">
              <span>{tituloSimulado}</span>
              <span>•</span>
              <span>Caderno de Prova Objetiva</span>
              <span>•</span>
              <span>Duração Recomendada: 4h</span>
            </div>
          </div>

          {/* Instruções aos Candidatos */}
          <div className="p-4 rounded-xl border border-slate-800 print:border-gray-400 bg-slate-900/40 print:bg-gray-50 text-[11px] font-sans space-y-1 text-slate-300 print:text-gray-800">
            <p className="font-bold uppercase tracking-wider text-slate-200 print:text-black">
              Instruções Gerais:
            </p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Verifique se este caderno contém a quantidade indicada de questões numeradas sequencialmente.</li>
              <li>Para cada questão, assinale apenas uma alternativa na folha de respostas ao final.</li>
              <li>Utilize caneta esferográfica de tinta azul ou preta fabricada em material transparente.</li>
              <li>Não é permitida a consulta a qualquer tipo de material bibliográfico durante a realização da prova.</li>
            </ol>
          </div>

          {/* Grade de Questões (2 Colunas em telas maiores e na impressão) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-4 print:grid-cols-2">
            {questoes.map((q, idx) => (
              <div
                key={q.id || idx}
                className="space-y-3 pb-5 border-b border-slate-800 print:border-gray-300 break-inside-avoid"
              >
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-bold text-primary-400 print:text-black">
                    QUESTÃO {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-slate-400 print:text-gray-600">
                    {q.disciplina_nome || 'Conhecimentos Gerais'} • {q.banca_nome || bancaNome}
                  </span>
                </div>

                {/* Enunciado */}
                <p className="text-xs sm:text-sm text-slate-200 print:text-black leading-relaxed text-justify">
                  {q.enunciado}
                </p>

                {/* Alternativas */}
                <div className="space-y-2 pt-1">
                  {q.alternativas.map((alt) => (
                    <div
                      key={alt.letra}
                      className="flex items-start gap-2.5 text-xs text-slate-300 print:text-black"
                    >
                      <span className="w-5 h-5 rounded-full border border-slate-600 print:border-black flex items-center justify-center font-sans font-bold text-[10px] shrink-0 text-slate-200 print:text-black mt-0.5">
                        {alt.letra}
                      </span>
                      <span className="leading-snug text-justify">{alt.texto}</span>
                    </div>
                  ))}
                </div>

                {/* Justificativa Comentada (se habilitada) */}
                {showJustificativas && q.justificativa_ia && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-900 print:bg-gray-100 border border-slate-800 print:border-gray-300 text-[11px] font-sans text-slate-400 print:text-gray-800">
                    <span className="font-bold text-emerald-400 print:text-emerald-700">
                      Gabarito: {q.alternativa_correta} —{' '}
                    </span>
                    {q.justificativa_ia}
                  </div>
                )}

              </div>
            ))}
          </div>

          {/* ======================================================== */}
          {/* FOLHA DE RESPOSTAS / CARTÃO-RESPOSTA DESTACÁVEL          */}
          {/* ======================================================== */}
          {showGabarito && (
            <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-700 print:border-black break-before-page space-y-6">
              <div className="text-center space-y-1">
                <span className="text-xs font-sans uppercase font-bold tracking-widest text-slate-400 print:text-gray-600">
                  Caderno de Prova • {bancaNome}
                </span>
                <h3 className="text-lg font-bold font-sans text-white print:text-black uppercase">
                  Folha de Respostas Oficial (Cartão-Resposta)
                </h3>
                <p className="text-xs font-sans text-slate-400 print:text-gray-600">
                  Preencha integralmente o círculo da alternativa correspondente.
                </p>
              </div>

              {/* Tabela de Preenchimento de Bolinhas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 p-4 rounded-2xl border border-slate-800 print:border-black bg-slate-900/60 print:bg-white">
                {questoes.map((q, idx) => {
                  const options = isCertoErrado ? ['C', 'E'] : ['A', 'B', 'C', 'D', 'E'];
                  return (
                    <div
                      key={q.id || idx}
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-800 print:border-gray-300 font-sans text-xs"
                    >
                      <span className="font-bold text-slate-400 print:text-black text-[11px]">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <div className="flex items-center gap-1.5">
                        {options.map((opt) => (
                          <div
                            key={opt}
                            className="w-5 h-5 rounded-full border border-slate-600 print:border-black flex items-center justify-center text-[10px] font-bold text-slate-300 print:text-black"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tabela de Gabarito Oficial ao Final da Folha */}
              <div className="p-4 rounded-xl border border-slate-800 print:border-gray-400 bg-slate-900/40 print:bg-gray-50 space-y-2">
                <h4 className="text-xs font-sans font-bold uppercase text-slate-300 print:text-black">
                  Gabarito Preliminar Oficial:
                </h4>
                <div className="flex flex-wrap gap-2 text-xs font-sans">
                  {questoes.map((q, idx) => (
                    <span
                      key={q.id || idx}
                      className="px-2 py-0.5 rounded bg-slate-800 print:bg-gray-200 text-slate-200 print:text-black font-semibold"
                    >
                      <strong>{idx + 1}:</strong> {q.alternativa_correta || '-'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
