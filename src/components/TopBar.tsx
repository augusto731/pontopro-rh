import React from 'react';
import { Search, Plus, Bell, UserCheck, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

interface TopBarProps {
  currentTab: string;
  onOpenQuickAction: () => void;
  onOpenSearch: () => void;
  userRole: UserRole;
  serverTime: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onOpenQuickAction,
  onOpenSearch,
  userRole,
  serverTime,
}) => {
  const tabTitles: Record<string, string> = {
    dashboard: 'Visão Geral',
    timesheet: 'Folha de Ponto & Espelho',
    kiosk: 'Terminal Quiosque (Tablet)',
    employees: 'Gestão de Colaboradores',
    schedules: 'Jornadas & Escalas',
    absences: 'Ausências & Férias',
    closing: 'Fechamento & Relatórios',
  };

  return (
    <header className="h-16 shrink-0 bg-[#0c1017] border-b border-slate-800/80 px-6 flex items-center justify-between gap-4">
      {/* Left: Breadcrumbs & Status */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-400">PontoPro</span>
        <span className="text-slate-600 text-xs">/</span>
        <span className="text-xs font-medium text-slate-200">{tabTitles[currentTab] || 'Visão Geral'}</span>
        
        {/* Status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-[10px] text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Operação Normal</span>
        </div>
      </div>

      {/* Middle: Search Bar (⌘K) */}
      <div className="flex-1 max-w-md hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-300 text-xs transition"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Buscar colaboradores, relatórios...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-[10px] font-mono text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Server Time Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
          <span className="text-slate-500">SP:</span>
          <span className="font-semibold text-blue-400">{serverTime || '12:00:00'}</span>
        </div>

        {/* Novo Registro Button */}
        <button
          onClick={onOpenQuickAction}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold shadow-xs transition active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Registro</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenQuickAction}
          className="relative p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Notificações e Pendências"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500"></span>
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
            {userRole === 'ADMIN' ? 'AA' : userRole === 'COLABORADOR' ? 'GF' : 'QS'}
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-medium text-slate-200 leading-tight">
              {userRole === 'ADMIN' ? 'Ana Clara (RH)' : userRole === 'COLABORADOR' ? 'Gabriel Ferreira' : 'Terminal Quiosque'}
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">
              {userRole === 'ADMIN' ? 'Diretoria de RH' : userRole === 'COLABORADOR' ? 'Dev Backend' : 'Público'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
