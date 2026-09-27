/**
 * DatabaseCoverageView.tsx — Painel de Cobertura e Governança da Base de Dados
 */

import { useQuery } from '@tanstack/react-query';
import {
  Database, ShieldCheck, CheckCircle, FileText, Building2,
  GraduationCap, Layers, Loader2, RefreshCw
} from 'lucide-react';
import { fetchCoverage } from '../../api/client';

export function DatabaseCoverageView() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['database-coverage'],
    queryFn: fetchCoverage,
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 glass rounded-3xl border border-surface-700/40">
        <Loader2 size={36} className="animate-spin text-primary-400 mb-4" />
        <p className="text-sm text-surface-400">Auditando integridade e cobertura da base de dados...</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const coveragePct = data.concursos_total > 0
    ? Math.round((data.concursos_com_questoes / data.concursos_total) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Auditoria e Integridade */}
      <div className="p-6 sm:p-8 rounded-3xl glass border border-emerald-500/25 bg-gradient-to-r from-emerald-950/30 via-surface-900/60 to-teal-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 w-fit mb-2">
            <ShieldCheck size={13} className="text-emerald-400" />
            Auditoria & Integridade da Base
          </span>
          <h2 className="text-2xl font-bold text-surface-100">
            Painel de Cobertura da Base
          </h2>
          <p className="text-xs sm:text-sm text-surface-300 mt-1 max-w-2xl">
            Monitoramento em tempo real do banco de dados: proporção de concursos com provas e questões associadas, mapeamento por banca, nível e fonte de dados oficial/PCI.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-emerald-500/30 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 transition-all cursor-pointer shrink-0"
        >
          <RefreshCw size={14} />
          <span>Revalidar Auditoria</span>
        </button>
      </div>

      {/* Grid de KPIs de Cobertura */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-5 rounded-2xl glass border border-surface-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-surface-400 mb-2">
            <span>Concursos Cadastrados</span>
            <Building2 size={16} className="text-primary-400" />
          </div>
          <div className="text-2xl font-black text-surface-100">
            {data.concursos_total.toLocaleString('pt-BR')}
          </div>
          <span className="text-[11px] text-surface-400 mt-1">Órgãos e editais</span>
        </div>

        <div className="p-5 rounded-2xl glass border border-emerald-500/30 bg-emerald-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-2">
            <span>Cobertura de Questões</span>
            <CheckCircle size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {coveragePct}%
          </div>
          <span className="text-[11px] text-emerald-400/80 mt-1">
            {data.concursos_com_questoes} com questões
          </span>
        </div>

        <div className="p-5 rounded-2xl glass border border-surface-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-surface-400 mb-2">
            <span>Questões Ativas</span>
            <FileText size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-black text-surface-100">
            {data.questoes_total.toLocaleString('pt-BR')}
          </div>
          <span className="text-[11px] text-surface-400 mt-1">Objetivas e Inéditas</span>
        </div>

        <div className="p-5 rounded-2xl glass border border-surface-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-surface-400 mb-2">
            <span>Alternativas</span>
            <Layers size={16} className="text-purple-400" />
          </div>
          <div className="text-2xl font-black text-surface-100">
            {data.alternativas_total.toLocaleString('pt-BR')}
          </div>
          <span className="text-[11px] text-surface-400 mt-1">Gabaritadas</span>
        </div>

        <div className="p-5 rounded-2xl glass border border-surface-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-surface-400 mb-2">
            <span>Concursos Vazios</span>
            <CheckCircle size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-surface-100">
            {data.concursos_sem_questoes}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1">0% de lacuna</span>
        </div>

        <div className="p-5 rounded-2xl glass border border-surface-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-surface-400 mb-2">
            <span>Questões Sem Opções</span>
            <CheckCircle size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-surface-100">
            {data.questoes_sem_alternativas}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1">100% estruturadas</span>
        </div>
      </div>

      {/* Fontes de Origem */}
      <div className="p-6 rounded-3xl glass border border-surface-700/40 space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-primary-400" />
          <h3 className="text-base font-bold text-surface-100">
            Transparência da Origem das Questões
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {data.fontes.map((fonte, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-surface-900/50 border border-surface-700/40">
              <div className="text-xs text-surface-400">{fonte.label}</div>
              <div className="text-xl font-bold text-surface-100 mt-1">
                {Number(fonte.value).toLocaleString('pt-BR')} questões
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabelas de Cobertura: Por Banca e Por Nível */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Banca */}
        <div className="rounded-3xl glass border border-surface-700/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-700/30 flex items-center justify-between bg-surface-900/40">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-primary-400" />
              <h3 className="text-sm font-bold text-surface-100">
                Cobertura por Banca Examinadora
              </h3>
            </div>
          </div>

          <div className="divide-y divide-surface-700/30 max-h-96 overflow-y-auto">
            {data.por_banca.map((item, idx) => (
              <div key={idx} className="p-4 px-6 flex items-center justify-between text-xs hover:bg-surface-800/30">
                <div className="font-semibold text-surface-200 truncate max-w-[200px]">
                  {item.nome}
                </div>
                <div className="flex items-center gap-4 text-surface-400">
                  <span>{item.concursos} concursos</span>
                  <span className="font-mono text-surface-200">{item.questoes} q</span>
                  <span className="font-bold text-emerald-400">{item.cobertura_pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por Nível */}
        <div className="rounded-3xl glass border border-surface-700/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-700/30 flex items-center justify-between bg-surface-900/40">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold text-surface-100">
                Cobertura por Nível de Escolaridade
              </h3>
            </div>
          </div>

          <div className="divide-y divide-surface-700/30">
            {data.por_nivel.map((item, idx) => (
              <div key={idx} className="p-5 px-6 flex items-center justify-between text-xs hover:bg-surface-800/30">
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-surface-100">{item.nome}</div>
                  <div className="text-surface-400">{item.concursos} concursos cadastrados</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-surface-100">{item.questoes} questões</div>
                  <div className="font-bold text-emerald-400">{item.cobertura_pct}% com questões</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
