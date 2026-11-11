import React from 'react';
import {
  LayoutDashboard,
  Clock,
  Fingerprint,
  Users,
  CalendarDays,
  CalendarX,
  BarChart3,
  Settings,
  HelpCircle,
  Plus,
  Shield,
  Building2,
  ChevronDown
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenQuickAction: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  companyName?: string;
  tradeName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenQuickAction,
  userRole,
  setUserRole,
  companyName = 'Acme Inc.',
  tradeName = 'PontoPro Enterprise',
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'COLABORADOR'] },
    { id: 'timesheet', label: 'Folha de Ponto', icon: Clock, roles: ['ADMIN', 'COLABORADOR'] },
    { id: 'kiosk', label: 'Registro Quiosque', icon: Fingerprint, roles: ['ADMIN', 'COLABORADOR', 'QUIOSQUE'] },
    { id: 'employees', label: 'Colaboradores', icon: Users, roles: ['ADMIN'] },
    { id: 'schedules', label: 'Jornadas & Escalas', icon: CalendarDays, roles: ['ADMIN'] },
    { id: 'absences', label: 'Ausências & Férias', icon: CalendarX, roles: ['ADMIN', 'COLABORADOR'] },
    { id: 'closing', label: 'Fechamento & Relatórios', icon: BarChart3, roles: ['ADMIN'] },
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 shrink-0 bg-[#0c1017] border-r border-slate-800/80 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-slate-100 truncate">{companyName}</div>
                <div className="text-[11px] text-slate-400 truncate">{tradeName}</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          </div>

          {/* Quick Action Button */}
          {userRole !== 'QUIOSQUE' && (
            <button
              onClick={onOpenQuickAction}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold tracking-wide border border-slate-700/60 shadow-sm transition active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              Ação Rápida
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Plataforma
          </div>
          <nav className="space-y-1">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.id === 'kiosk' && (
                    <span className="ml-auto text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/40 font-mono">
                      Tablet
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer & Role Switcher */}
      <div className="p-3 border-t border-slate-800/80 space-y-3">
        {/* Profile Switcher */}
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="flex items-center gap-1 font-medium">
              <Shield className="w-3 h-3 text-blue-400" />
              Perfil Ativo
            </span>
            <span className="text-[10px] uppercase font-mono text-blue-400 font-semibold">{userRole}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-md border border-slate-800/80 text-[10px]">
            <button
              onClick={() => setUserRole('ADMIN')}
              className={`py-1 text-center rounded transition font-medium ${
                userRole === 'ADMIN' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RH/Admin
            </button>
            <button
              onClick={() => setUserRole('COLABORADOR')}
              className={`py-1 text-center rounded transition font-medium ${
                userRole === 'COLABORADOR' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Colaborador
            </button>
            <button
              onClick={() => {
                setUserRole('QUIOSQUE');
                setCurrentTab('kiosk');
              }}
              className={`py-1 text-center rounded transition font-medium ${
                userRole === 'QUIOSQUE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quiosque
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setCurrentTab('closing')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            Configurações
          </button>
          <a
            href="https://www.gov.br/trabalho-e-emprego/pt-br"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Portaria MTP 671
          </a>
        </div>
      </div>
    </aside>
  );
};
