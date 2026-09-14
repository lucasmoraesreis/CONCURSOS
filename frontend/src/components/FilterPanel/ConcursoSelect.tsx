/**
 * ConcursoSelect — Filtro de seleção de concurso (nível 1)
 *
 * Select searchable que mostra concursos formatados como:
 * "Órgão - Cargo - Ano (Banca)"
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Building2, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchConcursos } from '../../api/client';
import { useFilterStore } from '../../stores/filterStore';
import type { Concurso } from '../../types';

export function ConcursoSelect() {
  const { concursoId, setConcurso } = useFilterStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['concursos', searchTerm],
    queryFn: () => fetchConcursos({ search: searchTerm || undefined, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const concursos = data?.items || [];

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(concurso: Concurso) {
    setConcurso(concurso.id);
    setSelectedLabel(concurso.label);
    setIsOpen(false);
    setSearchTerm('');
  }

  function handleClear() {
    setConcurso(null);
    setSelectedLabel('');
    setSearchTerm('');
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Label */}
      <label className="flex items-center gap-2 text-sm font-semibold text-surface-300 mb-2">
        <Building2 size={14} className="text-primary-400" />
        Concurso
      </label>

      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl glass
                   text-left transition-all duration-200
                   hover:border-primary-500/30 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      >
        <span className={`truncate ${concursoId ? 'text-surface-100' : 'text-surface-400'}`}>
          {selectedLabel || 'Selecione um concurso...'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {concursoId && (
            <button
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="p-1 rounded-lg hover:bg-surface-600/50 transition-colors"
            >
              <X size={14} className="text-surface-400" />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-surface-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 rounded-xl glass shadow-2xl shadow-black/40 overflow-hidden"
          >
            {/* Search input */}
            <div className="p-3 border-b border-surface-700/50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar órgão ou cargo..."
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-surface-800/60 border border-surface-600/30
                           text-sm text-surface-100 placeholder-surface-500
                           focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-10 w-full" />
                  ))}
                </div>
              ) : concursos.length === 0 ? (
                <div className="p-6 text-center text-sm text-surface-400">
                  Nenhum concurso encontrado
                </div>
              ) : (
                concursos.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2
                              text-sm transition-colors duration-100
                              ${c.id === concursoId
                                ? 'bg-primary-600/20 text-primary-300'
                                : 'text-surface-200 hover:bg-surface-700/50'
                              }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.orgao} — {c.cargo}</div>
                      <div className="text-xs text-surface-400 mt-0.5">
                        {c.banca_nome} • {c.ano} • {c.nivel}
                      </div>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-surface-700/60 text-xs font-mono text-surface-300">
                      {c.ano}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
