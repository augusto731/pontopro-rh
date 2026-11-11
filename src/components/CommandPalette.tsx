import React, { useState, useEffect } from 'react';
import { Search, Clock, Users, CalendarX, BarChart3, Fingerprint, X } from 'lucide-react';
import { Employee } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string, employeeId?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/employees')
        .then((res) => res.json())
        .then(setEmployees)
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quickNav = [
    { id: 'dashboard', label: 'Ir para Dashboard Geral', icon: Clock },
    { id: 'timesheet', label: 'Consultar Espelho de Ponto', icon: Clock },
    { id: 'kiosk', label: 'Abrir Registro Quiosque (Tablet)', icon: Fingerprint },
    { id: 'employees', label: 'Ver Colaboradores Cadastrados', icon: Users },
    { id: 'absences', label: 'Consultar Ausências & Férias', icon: CalendarX },
    { id: 'closing', label: 'Painel de Fechamento & Relatórios', icon: BarChart3 },
  ];

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.cpf.includes(query) ||
      e.role.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Buscar colaboradores por nome ou CPF, relatórios, atalhos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-hidden"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 text-xs space-y-1">
          {/* Quick Nav */}
          {!query && (
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Navegação Rápida
            </div>
          )}
          {!query &&
            quickNav.map((nav) => {
              const Icon = nav.icon;
              return (
                <button
                  key={nav.id}
                  onClick={() => {
                    onNavigateTab(nav.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-left text-slate-200 transition"
                >
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <span>{nav.label}</span>
                </button>
              );
            })}

          {/* Colaboradores encontrados */}
          {filteredEmployees.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Colaboradores ({filteredEmployees.length})
              </div>
              {filteredEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    onNavigateTab('timesheet', emp.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800 text-left transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-300">
                      {emp.avatarInitials}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 group-hover:text-white">
                        {emp.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{emp.role} • {emp.department}</div>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{emp.cpf}</span>
                </button>
              ))}
            </div>
          )}

          {query && filteredEmployees.length === 0 && (
            <div className="py-8 text-center text-slate-500">
              Nenhum resultado encontrado para &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
