import React, { useState } from 'react';
import {
  Download,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: string, employeeId?: string) => void;
  onOpenQuickAction: () => void;
  onExportExcel: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenQuickAction,
  onExportExcel,
}) => {
  const [timeFilter, setTimeFilter] = useState<'hoje' | '7dias' | 'mes' | 'ano'>('mes');
  const [chartRange, setChartRange] = useState<'3m' | '30d' | '7d'>('30d');
  const [pendingItems, setPendingItems] = useState([
    {
      id: 'pend-1',
      employeeId: 'emp-gf',
      name: 'Gabriel Ferreira',
      role: 'Dev Backend • Time Alpha',
      initials: 'GF',
      date: '23 Out, 2024',
      reason: 'Esquecimento Saída',
      icon: Clock,
      proposedTime: '18:05 (Intervalo 1h)',
    },
    {
      id: 'pend-2',
      employeeId: 'emp-pl',
      name: 'Patrícia Lima',
      role: 'Product Designer • UI/UX',
      initials: 'PL',
      date: '22 Out, 2024',
      reason: 'Consulta Médica (2h)',
      icon: FileText,
      proposedTime: '14:00 – 16:00 (Doc anexo)',
    },
    {
      id: 'pend-3',
      employeeId: 'emp-tm',
      name: 'Thiago Mansur',
      role: 'Analista Fiscal • Financeiro',
      initials: 'TM',
      date: '24 Out, 2024',
      reason: 'Falha Leitor Biométrico',
      icon: AlertCircle,
      proposedTime: '09:02 (Entrada 1)',
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleApprovePending = (id: string, name: string) => {
    setPendingItems((prev) => prev.filter((p) => p.id !== id));
    setToastMessage(`Ajuste de ${name} homologado com sucesso! Trilha de auditoria gerada.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRejectPending = (id: string, name: string) => {
    setPendingItems((prev) => prev.filter((p) => p.id !== id));
    setToastMessage(`Solicitação de ${name} rejeitada pelo RH.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-200 text-xs shadow-xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-medium text-slate-300 border border-slate-700/60">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visão geral da operação em tempo real • 24 de Outubro, 2024
          </p>
        </div>

        {/* Filters and Export Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setTimeFilter('hoje')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                timeFilter === 'hoje' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setTimeFilter('7dias')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                timeFilter === '7dias' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => setTimeFilter('mes')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                timeFilter === 'mes' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Este mês
            </button>
            <button
              onClick={() => setTimeFilter('ano')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                timeFilter === 'ano' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ano
            </button>
          </div>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Exportar dados</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Colaboradores Ativos */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Colaboradores Ativos</span>
            <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
              <TrendingUp className="w-3 h-3" />
              +12.5%
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-white mt-2 tracking-tight">148</div>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-300">
            <span className="font-medium text-slate-100">138 presentes hoje</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400 font-medium">93.2% assiduidade</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Adesão dentro da média esperada</div>
        </div>

        {/* Card 2: Horas Extras Acumuladas */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Horas Extras Acumuladas</span>
            <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
              <TrendingUp className="w-3 h-3" />
              +8.5%
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-white mt-2 tracking-tight">242h 30m</div>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-300">
            <span className="text-slate-400">Competência vigente</span>
            <span className="text-slate-600">·</span>
            <span className="font-medium text-slate-200">Meta: &lt; 260h</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Margem de segurança: 17h 30m</div>
        </div>

        {/* Card 3: Ajustes & Pendências */}
        <div
          onClick={() => onNavigateTab('timesheet')}
          className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-amber-500/40 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Ajustes & Pendências</span>
            <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
              <TrendingDown className="w-3 h-3" />
              -20%
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-2 tracking-tight">14</div>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-300">
            <span className="font-medium text-slate-200">Batidas ímpares</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-medium">Aguardando homologação</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Tempo médio de resposta: 2.1h</div>
        </div>

        {/* Card 4: Índice de Pontualidade */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Índice de Pontualidade</span>
            <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
              <TrendingUp className="w-3 h-3" />
              +2.4%
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-white mt-2 tracking-tight">96.8%</div>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-300">
            <span className="text-slate-400">Atrasos consolidados</span>
            <span className="text-slate-600">·</span>
            <span className="font-medium text-slate-200">12 ocorrências</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Tolerância padrão aplicada (10m)</div>
        </div>
      </div>

      {/* Middle Section: Spline Chart + Fechamento Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Evolução de Horas Extras & Frequência */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">Evolução de Horas Extras & Frequência</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Média acumulada por departamento e turnos ativos
                </p>
              </div>

              {/* Time Range Tabs */}
              <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                <button
                  onClick={() => setChartRange('3m')}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    chartRange === '3m' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Últimos 3 meses
                </button>
                <button
                  onClick={() => setChartRange('30d')}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    chartRange === '30d' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Últimos 30 dias
                </button>
                <button
                  onClick={() => setChartRange('7d')}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    chartRange === '7d' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Últimos 7 dias
                </button>
              </div>
            </div>

            {/* SVG Spline Area Chart */}
            <div className="relative h-48 w-full mt-6">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="areaGradSecondary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64748b" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#64748b" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                <line x1="0" y1="40" x2="700" y2="40" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="90" x2="700" y2="90" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="140" x2="700" y2="140" stroke="#1e293b" strokeDasharray="3 3" />

                {/* Secondary Dotted Baseline */}
                <path
                  d="M 0 150 C 120 148, 200 155, 350 145 C 500 135, 600 142, 700 138"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Primary Spline Area Fill */}
                <path
                  d="M 0 150 C 100 130, 200 70, 300 75 C 400 80, 500 50, 600 48 C 650 47, 680 32, 700 28 L 700 180 L 0 180 Z"
                  fill="url(#areaGrad)"
                />

                {/* Primary Spline Line */}
                <path
                  d="M 0 150 C 100 130, 200 70, 300 75 C 400 80, 500 50, 600 48 C 650 47, 680 32, 700 28"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />

                {/* Data Points */}
                <circle cx="0" cy="150" r="3" fill="#ffffff" />
                <circle cx="215" cy="85" r="4" fill="#ffffff" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="350" cy="74" r="4" fill="#ffffff" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="525" cy="52" r="4" fill="#ffffff" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="700" cy="28" r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
              </svg>
            </div>

            {/* Timeline Labels */}
            <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
              <span>01 Out</span>
              <span>07 Out</span>
              <span>14 Out</span>
              <span>21 Out</span>
              <span className="text-white font-semibold">Hoje (24 Out)</span>
            </div>
          </div>

          {/* Department Breakdown Strip */}
          <div className="grid grid-cols-3 gap-4 pt-5 mt-5 border-t border-slate-800/80">
            <div>
              <div className="text-xs text-slate-400">Engenharia & Produto</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-semibold font-mono text-white">84h 15m</span>
                <span className="text-[11px] text-emerald-400">(-4%)</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Operações & Suporte</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-semibold font-mono text-white">102h 40m</span>
                <span className="text-[11px] text-amber-400">(+6%)</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Comercial & Expansão</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-semibold font-mono text-white">55h 35m</span>
                <span className="text-[11px] text-emerald-400">(-1%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Fechamento Mensal */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Folha de Pagamento</span>
              <ShieldCheck className="w-4 h-4 text-slate-500" />
            </div>

            <h2 className="text-lg font-bold text-white mt-1">Fechamento Mensal</h2>

            {/* Big Progress Number */}
            <div className="flex items-baseline justify-between mt-4">
              <span className="text-4xl font-extrabold font-mono text-white tracking-tight">75.6%</span>
              <span className="text-xs text-slate-400 font-mono">112 de 148 validados</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: '75.6%' }}></div>
            </div>

            {/* Period Details */}
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
              <span>Competência: <strong className="text-slate-200">Out/2024</strong></span>
              <span className="text-amber-400 font-medium">6 dias restantes</span>
            </div>

            {/* Validation Counts */}
            <div className="space-y-2 mt-4 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Espelhos sem inconsistência</span>
                <span className="font-semibold font-mono text-slate-200">98</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Ajustes manuais efetuados</span>
                <span className="font-semibold font-mono text-slate-200">14</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Restantes para validação</span>
                <span className="font-bold font-mono text-amber-400">36 pendentes</span>
              </div>
            </div>
          </div>

          {/* Action CTA */}
          <button
            onClick={() => onNavigateTab('closing')}
            className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-semibold shadow-xs transition active:scale-[0.98]"
          >
            <span>Revisar Espelhos Restantes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Section: Pendências de Homologação + Distribuição de Ausências */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pendências de Homologação Imediata */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Pendências de Homologação Imediata</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono font-medium text-slate-300 border border-slate-700/60">
                {pendingItems.length} pendentes
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('timesheet')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table of pending cases */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 font-medium">Colaborador</th>
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Motivo / Tipo</th>
                  <th className="pb-3 font-medium">Horário Proposto</th>
                  <th className="pb-3 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      {/* Colaborador */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0">
                            {item.initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">{item.name}</div>
                            <div className="text-[11px] text-slate-400">{item.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Data */}
                      <td className="py-3.5 font-medium text-slate-300">{item.date}</td>

                      {/* Motivo */}
                      <td className="py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px]">
                          <Icon className="w-3 h-3 text-amber-400" />
                          <span>{item.reason}</span>
                        </span>
                      </td>

                      {/* Horário Proposto */}
                      <td className="py-3.5 font-mono text-slate-200">
                        {item.proposedTime}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprovePending(item.id, item.name)}
                            className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-medium text-xs transition"
                          >
                            Homologar
                          </button>
                          <button
                            onClick={() => handleRejectPending(item.id, item.name)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-400 text-xs transition"
                          >
                            Recusar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pendingItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Nenhuma pendência imediata aguardando homologação no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Distribuição de Ausências & Portaria 671 */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Distribuição de Ausências</h2>
              <span className="text-xs text-slate-500">•••</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Total de 26 afastamentos no mês</p>

            {/* Donut Chart */}
            <div className="relative flex items-center justify-center my-6">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" stroke="#1e293b" strokeWidth="10" fill="none" />
                {/* Atestado Médico: 45% = 107.4 circumference out of 238.76 */}
                <circle
                  cx="50" cy="50" r="38"
                  stroke="#3b82f6"
                  strokeWidth="10"
                  strokeDasharray="107.4 238.76"
                  strokeDashoffset="0"
                  fill="none"
                />
                {/* Férias: 35% = 83.56 */}
                <circle
                  cx="50" cy="50" r="38"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeDasharray="83.56 238.76"
                  strokeDashoffset="-107.4"
                  fill="none"
                />
                {/* Declarações: 12% = 28.65 */}
                <circle
                  cx="50" cy="50" r="38"
                  stroke="#f59e0b"
                  strokeWidth="10"
                  strokeDasharray="28.65 238.76"
                  strokeDashoffset="-190.96"
                  fill="none"
                />
                {/* Outras: 8% = 19.1 */}
                <circle
                  cx="50" cy="50" r="38"
                  stroke="#8b5cf6"
                  strokeWidth="10"
                  strokeDasharray="19.1 238.76"
                  strokeDashoffset="-219.61"
                  fill="none"
                />
              </svg>

              {/* Center Stat */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold font-mono text-white leading-none">26</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-1">Casos</span>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-slate-300">Atestado Médico</span>
                </div>
                <span className="font-mono text-slate-400">45% <span className="text-slate-500">(12)</span></span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-300">Férias Programadas</span>
                </div>
                <span className="font-mono text-slate-400">35% <span className="text-slate-500">(9)</span></span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-slate-300">Declarações & Aulas</span>
                </div>
                <span className="font-mono text-slate-400">12% <span className="text-slate-500">(3)</span></span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="text-slate-300">Outras Licenças</span>
                </div>
                <span className="font-mono text-slate-400">8% <span className="text-slate-500">(2)</span></span>
              </div>
            </div>
          </div>

          {/* Portaria 671 Compliance Banner */}
          <div className="mt-6 p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Portaria 671 / MTP</div>
                <div className="text-[10px] text-slate-400">Assinatura digital e AFD conformes</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] font-mono text-emerald-400 font-bold">
              100% OK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
