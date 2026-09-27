/**
 * StudyPlanView.tsx — Plano de Estudos Inteligente por Concurso e Cargo
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Target, Compass, Loader2,
  BookOpen, Play
} from 'lucide-react';
import { fetchStudyPlan, fetchFiltrosOpcoes } from '../../api/client';
import { useFilterStore } from '../../stores/filterStore';

interface StudyPlanViewProps {
  onStartStudyDiscipline: (disciplinaId: string) => void;
}

export function StudyPlanView({ onStartStudyDiscipline }: StudyPlanViewProps) {
  const [selectedConcursoId, setSelectedConcursoId] = useState<string>('');
  const [dias, setDias] = useState<number>(30);
  const setConcurso = useFilterStore((s) => s.setConcurso);

  // Lista de concursos para o seletor
  const { data: filtrosOpcoes } = useQuery({
    queryKey: ['filtros-opcoes-plan'],
    queryFn: () => fetchFiltrosOpcoes(),
    staleTime: 5 * 60 * 1000,
  });

  // Query do plano de estudos
  const { data: planData, isLoading } = useQuery({
    queryKey: ['study-plan', selectedConcursoId, dias],
    queryFn: () =>
      fetchStudyPlan({
        concurso_id: selectedConcursoId || undefined,
        dias,
      }),
    staleTime: 60 * 1000,
  });

  function handleConcursoChange(concursoId: string) {
    setSelectedConcursoId(concursoId);
    if (concursoId) {
      setConcurso(concursoId);
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Topo: Apresentação e Configuração do Plano */}
      <div className="p-6 sm:p-8 rounded-3xl glass border border-primary-500/25 bg-gradient-to-br from-primary-950/30 via-surface-900/60 to-indigo-950/30 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/20 border border-primary-500/30 text-xs font-semibold text-primary-300 w-fit mb-2">
              <Compass size={13} />
              Trilha de Aprovação Personalizada
            </span>
            <h2 className="text-2xl font-bold text-surface-100">
              Plano de Estudos & Metas Diárias
            </h2>
            <p className="text-xs sm:text-sm text-surface-300 mt-1 max-w-2xl">
              Selecione o concurso desejado e o horizonte de tempo até a prova. O algoritmo divide o volume de questões oficiais e inéditas em metas diárias sustentáveis com priorização.
            </p>
          </div>
        </div>

        {/* Seletores: Concurso e Dias */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {/* Seletor de Concurso */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-surface-300">
              Concurso / Cargo Alvo:
            </label>
            <select
              value={selectedConcursoId}
              onChange={(e) => handleConcursoChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl glass border border-surface-700/60 text-xs text-surface-100 bg-surface-900/90 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              <option value="">Plano Geral (Todas as disciplinas da base)</option>
              {(filtrosOpcoes?.concursos || []).slice(0, 80).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.orgao} — {c.cargo} ({c.ano})
                </option>
              ))}
            </select>
          </div>

          {/* Prazo em dias */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-surface-300">
              Tempo até a prova:
            </label>
            <div className="flex items-center gap-2">
              {[15, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDias(d)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dias === d
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                      : 'glass border border-surface-700/50 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {d} dias
                </button>
              ))}
            </div>
          </div>

          {/* Resumo da Meta */}
          <div className="flex items-center gap-4 p-3 rounded-2xl glass border border-surface-700/40 bg-surface-900/40">
            <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400">
              <Target size={22} />
            </div>
            <div>
              <div className="text-xs text-surface-400">Meta recomendada:</div>
              <div className="text-xl font-black text-surface-100">
                {planData ? `${planData.questoes_por_dia} questões/dia` : '--'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 glass rounded-3xl border border-surface-700/40">
          <Loader2 size={32} className="animate-spin text-primary-400 mb-3" />
          <p className="text-xs text-surface-400">Calculando cronograma e prioridades pedagógicas...</p>
        </div>
      )}

      {/* Exibição do Plano */}
      {!isLoading && planData && (
        <div className="space-y-6">
          {/* Card de Visão Geral */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl glass border border-surface-700/40">
              <span className="text-xs text-surface-400 font-medium">Plano</span>
              <p className="text-sm font-bold text-surface-200 truncate mt-1" title={planData.titulo}>
                {planData.titulo}
              </p>
            </div>
            <div className="p-5 rounded-2xl glass border border-surface-700/40">
              <span className="text-xs text-surface-400 font-medium">Total de Questões no Escopo</span>
              <p className="text-2xl font-black text-surface-100 mt-1">
                {planData.total_questoes}
              </p>
            </div>
            <div className="p-5 rounded-2xl glass border border-surface-700/40">
              <span className="text-xs text-surface-400 font-medium">Duração Estimada</span>
              <p className="text-2xl font-black text-primary-400 mt-1">
                {planData.dias_estimados} dias
              </p>
            </div>
            <div className="p-5 rounded-2xl glass border border-surface-700/40">
              <span className="text-xs text-surface-400 font-medium">Ritmo Recomendado</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {planData.questoes_por_dia} / dia
              </p>
            </div>
          </div>

          {/* Tabela de Matérias e Metas */}
          <div className="rounded-3xl glass border border-surface-700/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-700/30 flex items-center justify-between bg-surface-900/40">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-primary-400" />
                <h3 className="text-sm font-bold text-surface-100">
                  Distribuição por Disciplina & Carga de Revisão
                </h3>
              </div>
              <span className="text-xs text-surface-400">
                {planData.itens.length} disciplinas mapeadas
              </span>
            </div>

            <div className="divide-y divide-surface-700/30">
              {planData.itens.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-surface-800/30 transition-all"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.prioridade === 'Alta'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : item.prioridade === 'Media'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        Prioridade {item.prioridade}
                      </span>
                      <h4 className="text-sm font-bold text-surface-100 truncate">
                        {item.disciplina}
                      </h4>
                    </div>
                    <p className="text-xs text-surface-400">
                      {item.questoes} questões no acervo cadastrado
                    </p>
                  </div>

                  {/* Metas da Disciplina */}
                  <div className="flex items-center gap-6 text-xs shrink-0">
                    <div className="text-center">
                      <div className="text-surface-400">Meta Diária</div>
                      <div className="text-base font-bold text-surface-100">
                        {item.meta_diaria} q/dia
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-surface-400">Revisões/sem</div>
                      <div className="text-base font-bold text-primary-300">
                        {item.revisoes_semanais}x
                      </div>
                    </div>

                    {item.disciplina_id && (
                      <button
                        onClick={() => onStartStudyDiscipline(String(item.disciplina_id))}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs transition-all shadow-md shadow-primary-600/20 cursor-pointer"
                      >
                        <Play size={12} />
                        <span>Praticar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
