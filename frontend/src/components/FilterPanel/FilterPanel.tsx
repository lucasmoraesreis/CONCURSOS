/**
 * FilterPanel — Container principal dos filtros cascata
 *
 * Layout: Concurso (nível 1) → Disciplinas (nível 2) → Assuntos (nível 3)
 * Os filtros aparecem progressivamente conforme o usuário faz seleções.
 */

import { Filter, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConcursoSelect } from './ConcursoSelect';
import { DisciplinaSelect } from './DisciplinaSelect';
import { AssuntoSelect } from './AssuntoSelect';
import { useFilterStore } from '../../stores/filterStore';

export function FilterPanel() {
  const { concursoId, disciplinaId, resetAll } = useFilterStore();
  const hasActiveFilters = !!concursoId;

  return (
    <motion.aside
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full lg:w-80 xl:w-96 shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-surface-100">
          <div className="p-1.5 rounded-lg bg-primary-500/20">
            <Filter size={16} className="text-primary-400" />
          </div>
          Filtros
        </h2>
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     text-xs font-medium text-surface-400 hover:text-surface-200
                     bg-surface-800/50 hover:bg-surface-700/50
                     transition-all duration-200"
          >
            <RotateCcw size={12} />
            Limpar
          </motion.button>
        )}
      </div>

      {/* Filtros cascata */}
      <div className="space-y-5">
        {/* Nível 1: Concurso */}
        <ConcursoSelect />

        {/* Nível 2: Disciplinas (aparece após selecionar concurso) */}
        <DisciplinaSelect />

        {/* Nível 3: Assuntos (aparece após selecionar disciplina) */}
        <AssuntoSelect />
      </div>

      {/* Indicador de seleção ativa */}
      {concursoId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary-600/10 to-primary-500/5
                   border border-primary-500/20"
        >
          <div className="text-xs text-surface-400 mb-1">Filtros ativos</div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs font-medium">
              Concurso ✓
            </span>
            {disciplinaId && (
              <span className="px-2.5 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs font-medium">
                Disciplina ✓
              </span>
            )}
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
}
