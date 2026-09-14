/**
 * AssuntoSelect — Filtro cascata de assuntos (nível 3)
 *
 * Aparece APENAS quando concurso E disciplina estão selecionados.
 * Lista aninhada com checkboxes para seleção múltipla.
 */

import { useQuery } from '@tanstack/react-query';
import { Tag, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAssuntos } from '../../api/client';
import { useFilterStore } from '../../stores/filterStore';

export function AssuntoSelect() {
  const { concursoId, disciplinaId, assuntoId, setAssunto } = useFilterStore();

  const { data: assuntos = [], isLoading } = useQuery({
    queryKey: ['assuntos', disciplinaId, concursoId],
    queryFn: () => fetchAssuntos(disciplinaId!, concursoId!),
    enabled: !!concursoId && !!disciplinaId,
    staleTime: 5 * 60 * 1000,
  });

  if (!concursoId || !disciplinaId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
    >
      {/* Label */}
      <label className="flex items-center gap-2 text-sm font-semibold text-surface-300 mb-2">
        <Tag size={14} className="text-primary-400" />
        Assuntos
        {assuntos.length > 0 && (
          <span className="text-xs text-surface-500">({assuntos.length})</span>
        )}
      </label>

      {/* Lista de assuntos */}
      <div className="rounded-xl glass overflow-hidden">
        {isLoading ? (
          <div className="p-6 flex items-center justify-center gap-2 text-sm text-surface-400">
            <Loader2 size={16} className="animate-spin" />
            Carregando assuntos...
          </div>
        ) : assuntos.length === 0 ? (
          <div className="p-6 text-center text-sm text-surface-400">
            Nenhum assunto encontrado
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <AnimatePresence>
              {assuntos.map((a, i) => {
                const isSelected = a.id === assuntoId;
                return (
                  <motion.button
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setAssunto(isSelected ? null : a.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3
                              text-sm transition-all duration-150 border-b border-surface-700/30 last:border-0
                              ${isSelected
                                ? 'bg-primary-600/20 text-primary-200'
                                : 'text-surface-300 hover:bg-surface-700/40 hover:text-surface-100'
                              }`}
                  >
                    {/* Checkbox visual */}
                    <div className={`shrink-0 w-4.5 h-4.5 rounded-md border transition-colors
                      ${isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-surface-500 bg-transparent'
                      }`}>
                      {isSelected && <CheckCircle2 size={18} className="text-white -ml-[1px] -mt-[1px]" />}
                    </div>

                    <span className="flex-1 truncate">{a.nome}</span>

                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs
                      ${isSelected
                        ? 'bg-primary-500/30 text-primary-300 font-semibold'
                        : 'bg-surface-700/60 text-surface-500'
                      }`}>
                      {a.total_questoes}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
