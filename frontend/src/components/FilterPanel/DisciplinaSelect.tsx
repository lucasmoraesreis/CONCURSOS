/**
 * DisciplinaSelect — Filtro cascata de disciplinas (nível 2)
 *
 * Aparece APENAS quando um concurso é selecionado.
 * Mostra disciplinas com badge de contagem de questões.
 */

import { useQuery } from '@tanstack/react-query';
import { BookOpen, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDisciplinas } from '../../api/client';
import { useFilterStore } from '../../stores/filterStore';

export function DisciplinaSelect() {
  const { concursoId, disciplinaId, setDisciplina } = useFilterStore();

  const { data: disciplinas = [], isLoading } = useQuery({
    queryKey: ['disciplinas', concursoId],
    queryFn: () => fetchDisciplinas(concursoId!),
    enabled: !!concursoId,
    staleTime: 5 * 60 * 1000,
  });

  if (!concursoId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Label */}
      <label className="flex items-center gap-2 text-sm font-semibold text-surface-300 mb-2">
        <BookOpen size={14} className="text-primary-400" />
        Disciplinas
        {disciplinas.length > 0 && (
          <span className="text-xs text-surface-500">({disciplinas.length})</span>
        )}
      </label>

      {/* Lista de disciplinas */}
      <div className="rounded-xl glass overflow-hidden">
        {isLoading ? (
          <div className="p-6 flex items-center justify-center gap-2 text-sm text-surface-400">
            <Loader2 size={16} className="animate-spin" />
            Carregando disciplinas...
          </div>
        ) : disciplinas.length === 0 ? (
          <div className="p-6 text-center text-sm text-surface-400">
            Nenhuma disciplina encontrada
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            <AnimatePresence>
              {disciplinas.map((d, i) => (
                <motion.button
                  key={d.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setDisciplina(disciplinaId === d.id ? null : d.id)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3
                            text-sm transition-all duration-150 border-b border-surface-700/30 last:border-0
                            ${d.id === disciplinaId
                              ? 'bg-primary-600/20 text-primary-200 border-l-2 border-l-primary-500'
                              : 'text-surface-200 hover:bg-surface-700/40'
                            }`}
                >
                  <span className="font-medium truncate">{d.nome}</span>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold
                    ${d.id === disciplinaId
                      ? 'bg-primary-500/30 text-primary-300'
                      : 'bg-surface-700/60 text-surface-400'
                    }`}>
                    {d.total_questoes}
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
