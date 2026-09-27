/**
 * StudyDashboardView.tsx — Painel de Desempenho e Métricas do Aluno
 */

import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, CheckCircle, XCircle, Clock, Heart, Award,
  BookOpen, Building2, AlertCircle, ArrowRight, Loader2, Sparkles,
  Trophy, Zap, Lock, ShieldCheck
} from 'lucide-react';
import { fetchStudyDashboard, fetchGamificationProfile } from '../../api/client';
import type { Questao } from '../../types';

interface StudyDashboardViewProps {
  onGoToErrors: () => void;
  onGoToReviews: () => void;
  onStartSimulado: () => void;
  onSelectQuestion?: (questao: Questao) => void;
}

export function StudyDashboardView({
  onGoToErrors,
  onGoToReviews,
  onStartSimulado,
}: StudyDashboardViewProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['study-dashboard'],
    queryFn: fetchStudyDashboard,
    staleTime: 30 * 1000,
  });

  const { data: gamification } = useQuery({
    queryKey: ['study-gamification'],
    queryFn: fetchGamificationProfile,
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 glass rounded-3xl border border-surface-700/40">
        <Loader2 size={36} className="animate-spin text-primary-400 mb-4" />
        <p className="text-sm text-surface-400">Carregando métricas de estudo e rendimento...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 glass rounded-3xl border border-red-500/20 text-center">
        <AlertCircle size={32} className="mx-auto text-red-400 mb-3" />
        <h3 className="text-lg font-bold text-surface-100">Não foi possível carregar o painel</h3>
        <p className="text-xs text-surface-400 mt-1 mb-4">Verifique a conexão com o servidor local.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-semibold hover:bg-primary-500 transition-all cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Boas-Vindas e Ação Rápida */}
      <div className="p-6 sm:p-8 rounded-3xl glass border border-primary-500/20 bg-gradient-to-r from-primary-950/40 via-surface-900/60 to-purple-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/20 border border-primary-500/30 text-xs font-semibold text-primary-300">
              <Sparkles size={12} className="text-primary-400" />
              Diagnóstico de Aprendizagem Ativa
            </span>
          </div>
          <h2 className="text-2xl font-bold text-surface-100 tracking-tight">
            Painel de Desempenho & Retenção
          </h2>
          <p className="text-sm text-surface-300 mt-1 max-w-2xl">
            Acompanhe sua taxa de conversão em acertos, revise questões no timing exato da curva de esquecimento e elimine pontos fracos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onStartSimulado}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 shadow-lg shadow-primary-600/30 transition-all cursor-pointer"
          >
            <Award size={16} />
            <span>Iniciar Simulado</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {data.kpis.map((kpi, idx) => {
          let icon = <TrendingUp size={18} className="text-primary-400" />;
          let borderAccent = 'border-surface-700/50';

          if (kpi.label.includes('Taxa')) {
            icon = <Award size={18} className="text-emerald-400" />;
            borderAccent = 'border-emerald-500/30 bg-emerald-950/10';
          } else if (kpi.label.includes('Erros')) {
            icon = <XCircle size={18} className="text-red-400" />;
            borderAccent = 'border-red-500/30 bg-red-950/10';
          } else if (kpi.label.includes('Revis')) {
            icon = <Clock size={18} className="text-amber-400" />;
            borderAccent = 'border-amber-500/30 bg-amber-950/10';
          } else if (kpi.label.includes('Favorit')) {
            icon = <Heart size={18} className="text-rose-400" />;
            borderAccent = 'border-rose-500/30 bg-rose-950/10';
          } else if (kpi.label.includes('respondidas')) {
            icon = <CheckCircle size={18} className="text-blue-400" />;
          }

          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl glass border ${borderAccent} flex flex-col justify-between transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-surface-400 font-medium leading-tight">
                  {kpi.label}
                </span>
                {icon}
              </div>
              <div>
                <div className="text-2xl font-black text-surface-100 tracking-tight">
                  {kpi.value}
                </div>
                {kpi.detail && (
                  <p className="text-[11px] text-surface-400 mt-1">{kpi.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Gamificação: Liga, XP & Mural de Conquistas */}
      {gamification && (
        <div className="space-y-6">
          {/* Card de Liga e Nível */}
          <div className="p-6 rounded-3xl glass border border-amber-500/20 bg-gradient-to-r from-amber-950/20 via-surface-900/60 to-purple-950/20 shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner shadow-amber-500/20 shrink-0">
                {gamification.liga.icone}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Liga {gamification.liga.nome}
                  </span>
                  <span className="text-xs font-semibold text-surface-400 bg-surface-800 px-2 py-0.5 rounded-full border border-surface-700/60">
                    Nível {gamification.liga.nivel}
                  </span>
                  <span className="text-xs font-semibold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/20">
                    #{gamification.liga.posicao_ranking} no Ranking
                  </span>
                </div>
                <h3 className="text-xl font-black text-surface-100 flex items-center gap-2">
                  <span>Carreira Rumo à Aprovação</span>
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  Ganhe +10 XP por acerto, +20 XP por revisão concluída e suba para as ligas superiores.
                </p>
              </div>
            </div>

            {/* Barra de XP da Liga */}
            <div className="w-full lg:w-96 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Zap size={14} className="text-amber-400 fill-amber-400" />
                  {gamification.xp_total.toLocaleString()} XP Total
                </span>
                <span className="text-surface-400 font-medium">
                  {gamification.liga.xp_atual} / {gamification.liga.xp_proximo_nivel} XP p/ subir
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-800/90 border border-surface-700/50 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 shadow-sm transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(5, Math.round((gamification.liga.xp_atual / (gamification.liga.xp_proximo_nivel || 1)) * 100)))}%`
                  }}
                />
              </div>
              <div className="flex justify-end text-[11px] text-surface-400">
                {Math.max(0, gamification.liga.xp_proximo_nivel - gamification.liga.xp_atual)} XP restantes para próxima liga
              </div>
            </div>
          </div>

          {/* Mural de Conquistas (Badges) */}
          <div className="p-6 rounded-3xl glass border border-surface-700/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <Trophy size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-surface-100">Mural de Conquistas & Insígnias</h3>
                  <p className="text-xs text-surface-400">Desbloqueie marcos pedagógicos de disciplina e retenção</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-800 border border-surface-700 text-xs font-semibold text-surface-300">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>{gamification.conquistas_desbloqueadas} de {gamification.conquistas_total}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 pt-2">
              {gamification.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-2xl glass border flex flex-col justify-between transition-all ${
                    badge.unlocked
                      ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent hover:border-amber-400/60 shadow-lg shadow-amber-500/5'
                      : 'border-surface-800 bg-surface-900/40 opacity-70 hover:opacity-90'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{badge.icone}</span>
                      {badge.unlocked ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Obtido
                        </span>
                      ) : (
                        <Lock size={12} className="text-surface-500" />
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-surface-100 truncate mb-1">
                      {badge.titulo}
                    </h4>
                    <p className="text-[11px] text-surface-400 line-clamp-2 leading-relaxed">
                      {badge.descricao}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-surface-800/60">
                    <div className="flex items-center justify-between text-[10px] text-surface-400 mb-1">
                      <span>Progresso</span>
                      <span className={badge.unlocked ? 'text-emerald-400 font-bold' : 'text-surface-400'}>
                        {badge.progresso_pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          badge.unlocked
                            ? 'bg-gradient-to-r from-amber-400 to-emerald-400'
                            : 'bg-surface-600'
                        }`}
                        style={{ width: `${Math.max(4, badge.progresso_pct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gráficos / Desempenho por Disciplina e por Banca */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desempenho por Disciplina */}
        <div className="p-6 rounded-3xl glass border border-surface-700/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary-500/15 text-primary-400">
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-surface-100">Desempenho por Disciplina</h3>
                <p className="text-xs text-surface-400">Rendimento nas matérias mais resolvidas</p>
              </div>
            </div>
          </div>

          {data.desempenho_por_disciplina.length === 0 ? (
            <div className="py-12 text-center text-xs text-surface-400">
              Nenhuma questão respondida ainda. Comece a praticar no Banco de Questões!
            </div>
          ) : (
            <div className="space-y-3.5 pt-2">
              {data.desempenho_por_disciplina.map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-surface-200 truncate max-w-[220px]">
                      {item.nome}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-surface-400">
                        {item.acertos}/{item.total} certas
                      </span>
                      <span className={`font-bold ${
                        item.taxa_acerto >= 70 ? 'text-emerald-400' : item.taxa_acerto >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {item.taxa_acerto}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.taxa_acerto >= 70
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : item.taxa_acerto >= 50
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-r from-red-500 to-rose-400'
                      }`}
                      style={{ width: `${Math.max(4, item.taxa_acerto)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desempenho por Banca */}
        <div className="p-6 rounded-3xl glass border border-surface-700/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-surface-100">Desempenho por Banca</h3>
                <p className="text-xs text-surface-400">Taxa de acerto nos estilos examinadores</p>
              </div>
            </div>
          </div>

          {data.desempenho_por_banca.length === 0 ? (
            <div className="py-12 text-center text-xs text-surface-400">
              Nenhuma questão respondida ainda. Pratique questões de bancas como Cebraspe e FGV!
            </div>
          ) : (
            <div className="space-y-3.5 pt-2">
              {data.desempenho_por_banca.map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-surface-200 truncate max-w-[220px]">
                      {item.nome}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-surface-400">
                        {item.acertos}/{item.total} certas
                      </span>
                      <span className={`font-bold ${
                        item.taxa_acerto >= 70 ? 'text-emerald-400' : item.taxa_acerto >= 50 ? 'text-amber-400' : 'text-purple-400'
                      }`}>
                        {item.taxa_acerto}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.taxa_acerto >= 70
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : item.taxa_acerto >= 50
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-r from-purple-500 to-indigo-400'
                      }`}
                      style={{ width: `${Math.max(4, item.taxa_acerto)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cards de Atalho Rápido para Caderno de Erros e Revisões */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Caderno de Erros */}
        <div className="p-6 rounded-3xl glass border border-red-500/20 bg-gradient-to-br from-red-950/20 to-surface-900/40 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                <XCircle size={14} />
                Caderno de Erros Ativo
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-bold">
                {data.erros_recentes.length} recentes
              </span>
            </div>
            <h4 className="text-base font-bold text-surface-100">
              Refaça apenas o que errou
            </h4>
            <p className="text-xs text-surface-300 mt-1 leading-relaxed">
              Questões que você respondeu incorretamente ficam arquivadas aqui até você acertá-las e consolidar o conteúdo.
            </p>
          </div>
          <button
            onClick={onGoToErrors}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-red-600/30 hover:bg-red-600/40 border border-red-500/40 text-red-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <span>Abrir Caderno de Erros</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Revisão Espaçada */}
        <div className="p-6 rounded-3xl glass border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-surface-900/40 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Clock size={14} />
                Spaced Repetition
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                {data.revisoes_pendentes.length} pendentes
              </span>
            </div>
            <h4 className="text-base font-bold text-surface-100">
              Revisão Espaçada Automática
            </h4>
            <p className="text-xs text-surface-300 mt-1 leading-relaxed">
              O algoritmo programa suas questões para retornarem em 1, 3, 7 e 15 dias, garantindo retenção na memória de longo prazo.
            </p>
          </div>
          <button
            onClick={onGoToReviews}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-amber-600/30 hover:bg-amber-600/40 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <span>Praticar Revisões do Dia</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
