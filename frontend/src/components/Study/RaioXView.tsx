/**
 * RaioXView.tsx — Raio-X Estatístico da Banca e do Edital ("O que mais cai na prova")
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, BarChart2, Building2, Flame, Loader2, Play
} from 'lucide-react';
import { fetchRaioX, fetchFiltrosOpcoes } from '../../api/client';
import { useFilterStore } from '../../stores/filterStore';

interface RaioXViewProps {
  onStartPractice?: (disciplinaNome: string, assuntoNome: string) => void;
}

export function RaioXView({ onStartPractice }: RaioXViewProps) {
  const [selectedBancaId, setSelectedBancaId] = useState<string>('');
  const [selectedConcursoId, setSelectedConcursoId] = useState<string>('');

  const setSearch = useFilterStore((s) => s.setSearch);

  // Lista de bancas e concursos
  const { data: filtrosOpcoes } = useQuery({
    queryKey: ['filtros-opcoes-raiox'],
    queryFn: () => fetchFiltrosOpcoes(),
    staleTime: 5 * 60 * 1000,
  });

  // Query do Raio-X
  const { data, isLoading } = useQuery({
    queryKey: ['study-raio-x', selectedBancaId, selectedConcursoId],
    queryFn: () =>
      fetchRaioX({
        banca_id: selectedBancaId || undefined,
        concurso_id: selectedConcursoId || undefined,
      }),
    staleTime: 60 * 1000,
  });

  function handleFilterSubject(assunto: string) {
    setSearch(assunto);
    if (onStartPractice) {
      onStartPractice('', assunto);
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass border border-amber-500/25 bg-gradient-to-r from-amber-950/30 via-surface-900/60 to-orange-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 w-fit mb-2">
            <Flame size={12} className="text-amber-400" />
            Engenharia Reversa de Bancas
          </span>
          <h2 className="text-2xl font-bold text-surface-100">
            Raio-X Estatístico de Incidência
          </h2>
          <p className="text-xs sm:text-sm text-surface-300 mt-1 max-w-xl">
            Descubra os assuntos com maior probabilidade matemática de estarem na sua prova com base no histórico real da banca.
          </p>
        </div>

        {data && (
          <div className="px-4 py-2.5 rounded-2xl glass border border-surface-700/60 text-xs font-semibold text-surface-300">
            <strong className="text-amber-300">{data.total_questoes_analisadas}</strong> questões mapeadas
          </div>
        )}
      </div>

      {/* Seletores: Banca ou Concurso */}
      <div className="p-6 rounded-3xl glass border border-surface-700/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-surface-300 flex items-center gap-1.5">
            <Building2 size={13} className="text-primary-400" />
            Selecionar Banca Examinadora:
          </label>
          <select
            value={selectedBancaId}
            onChange={(e) => {
              setSelectedBancaId(e.target.value);
              if (e.target.value) setSelectedConcursoId('');
            }}
            className="w-full px-4 py-3 rounded-xl glass border border-surface-700/60 text-xs text-surface-100 bg-surface-900/90 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">Todas as Bancas (Visão Global)</option>
            {(filtrosOpcoes?.bancas || []).map((b) => (
              <option key={String(b.id)} value={String(b.id)}>
                {b.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-surface-300 flex items-center gap-1.5">
            <BarChart2 size={13} className="text-primary-400" />
            Ou filtrar por Concurso Alvo:
          </label>
          <select
            value={selectedConcursoId}
            onChange={(e) => {
              setSelectedConcursoId(e.target.value);
              if (e.target.value) setSelectedBancaId('');
            }}
            className="w-full px-4 py-3 rounded-xl glass border border-surface-700/60 text-xs text-surface-100 bg-surface-900/90 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="">Qualquer concurso</option>
            {(filtrosOpcoes?.concursos || []).slice(0, 80).map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.orgao} — {c.cargo} ({c.ano})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 glass rounded-3xl border border-surface-700/40">
          <Loader2 size={36} className="animate-spin text-amber-400 mb-3" />
          <p className="text-xs text-surface-400">Processando incidência estatística da banca...</p>
        </div>
      )}

      {/* Resultados do Raio-X */}
      {!isLoading && data && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-surface-400 px-1">
            <span>{data.titulo}</span>
            <span>{data.disciplinas.length} disciplinas identificadas</span>
          </div>

          <div className="space-y-6">
            {data.disciplinas.map((disc, idx) => (
              <div key={idx} className="p-6 rounded-3xl glass border border-surface-700/40 space-y-4">
                {/* Cabeçalho da Disciplina */}
                <div className="flex items-center justify-between border-b border-surface-700/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                      <PieChart size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-surface-100">
                        {disc.disciplina}
                      </h3>
                      <p className="text-xs text-surface-400">
                        {disc.total_questoes} questões ({disc.percentual}% da prova)
                      </p>
                    </div>
                  </div>

                  <span className="text-lg font-black text-amber-300">
                    {disc.percentual}%
                  </span>
                </div>

                {/* Tópicos Mais Cobrados */}
                <div className="space-y-3 pt-1">
                  {disc.topicos.map((top, tIdx) => (
                    <div key={tIdx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            top.relevancia === 'Muito Alta'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : top.relevancia === 'Alta'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {top.relevancia}
                          </span>
                          <span className="font-semibold text-surface-200">
                            {top.assunto}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-surface-400 font-mono">
                            {top.total_questoes} q ({top.percentual}%)
                          </span>
                          <button
                            onClick={() => handleFilterSubject(top.assunto)}
                            className="p-1 rounded-lg text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 transition-all cursor-pointer"
                            title="Praticar questões deste tópico"
                          >
                            <Play size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Barra de Progresso / Incidência */}
                      <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            top.relevancia === 'Muito Alta'
                              ? 'bg-gradient-to-r from-red-500 to-rose-400'
                              : top.relevancia === 'Alta'
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                          }`}
                          style={{ width: `${Math.max(5, top.percentual)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
