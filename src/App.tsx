import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { TimesheetView } from './components/TimesheetView';
import { KioskView } from './components/KioskView';
import { EmployeesView } from './components/EmployeesView';
import { SchedulesView } from './components/SchedulesView';
import { AbsencesView } from './components/AbsencesView';
import { ClosingView } from './components/ClosingView';
import { QuickActionModal } from './components/QuickActionModal';
import { EditPunchModal } from './components/EditPunchModal';
import { AuditTrailModal } from './components/AuditTrailModal';
import { CommandPalette } from './components/CommandPalette';
import { PunchRecord, UserRole } from './types';
import { ArrowLeft, Clock } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('emp-gf');
  const [serverTime, setServerTime] = useState<string>('12:00:00');

  // Modals state
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState(false);
  const [auditModal, setAuditModal] = useState<{ isOpen: boolean; employeeId?: string }>({
    isOpen: false,
  });
  const [editPunchModal, setEditPunchModal] = useState<{
    isOpen: boolean;
    employeeId: string;
    punchToEdit?: PunchRecord | null;
    defaultDate?: string;
  }>({
    isOpen: false,
    employeeId: 'emp-gf',
  });

  // Atualiza relógio do servidor periodicamente
  useEffect(() => {
    const fetchServerTime = () => {
      fetch('/api/time')
        .then((res) => res.json())
        .then((data) => setServerTime(data.serverTime))
        .catch(() => {});
    };
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 2000);
    return () => clearInterval(interval);
  }, []);

  // Atalho ⌘K e ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchPaletteOpen(false);
        setIsQuickActionOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (tab: string, employeeId?: string) => {
    setCurrentTab(tab);
    if (employeeId) {
      setSelectedEmployeeId(employeeId);
    }
  };

  const handleSelectQuickAction = (actionId: string) => {
    if (actionId === 'open-kiosk') {
      setCurrentTab('kiosk');
    } else if (actionId === 'manual-punch') {
      setCurrentTab('timesheet');
      setEditPunchModal({
        isOpen: true,
        employeeId: selectedEmployeeId,
      });
    } else if (actionId === 'new-absence') {
      setCurrentTab('absences');
    } else if (actionId === 'new-employee') {
      setCurrentTab('employees');
    } else if (actionId === 'download-pdf') {
      const a = document.createElement('a');
      a.href = `/api/pdf/timesheet/${selectedEmployeeId}/2024-10`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (actionId === 'export-excel') {
      window.location.href = '/api/export/excel/2024-10';
    }
  };

  const handleExportExcel = () => {
    window.location.href = '/api/export/excel/2024-10';
  };

  // Se o perfil for estritamente QUIOSQUE (Tablet público)
  if (userRole === 'QUIOSQUE') {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col justify-between p-4">
        {/* Header com botão de voltar para os administradores */}
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">PontoPro</span>
            <span className="text-xs text-slate-500 font-mono">Tablet Kiosk REP-P</span>
          </div>

          <button
            onClick={() => {
              setUserRole('ADMIN');
              setCurrentTab('dashboard');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-400 hover:text-white border border-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sair do Modo Quiosque</span>
          </button>
        </div>

        <main className="flex-1 flex items-center justify-center my-6">
          <KioskView />
        </main>

        <footer className="text-center text-[11px] text-slate-500 font-mono py-2">
          Portaria MTP 671/2021 • REP-P Oficial • Sincronizado com o Horário de Brasília
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-row overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenQuickAction={() => setIsQuickActionOpen(true)}
        userRole={userRole}
        setUserRole={setUserRole}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <TopBar
          currentTab={currentTab}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
          onOpenSearch={() => setIsSearchPaletteOpen(true)}
          userRole={userRole}
          serverTime={serverTime}
        />

        {/* Content Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={handleNavigate}
              onOpenQuickAction={() => setIsQuickActionOpen(true)}
              onExportExcel={handleExportExcel}
            />
          )}

          {currentTab === 'timesheet' && (
            <TimesheetView
              userRole={userRole}
              selectedEmployeeId={selectedEmployeeId}
              onOpenManualPunch={(empId, dateStr) =>
                setEditPunchModal({
                  isOpen: true,
                  employeeId: empId,
                  defaultDate: dateStr,
                })
              }
              onOpenEditPunch={(punch) =>
                setEditPunchModal({
                  isOpen: true,
                  employeeId: punch.employeeId,
                  punchToEdit: punch,
                })
              }
              onOpenAuditTrail={(empId) =>
                setAuditModal({
                  isOpen: true,
                  employeeId: empId,
                })
              }
            />
          )}

          {currentTab === 'kiosk' && <KioskView />}

          {currentTab === 'employees' && <EmployeesView />}

          {currentTab === 'schedules' && <SchedulesView />}

          {currentTab === 'absences' && <AbsencesView userRole={userRole} />}

          {currentTab === 'closing' && <ClosingView userRole={userRole} />}
        </main>
      </div>

      {/* Modals */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onSelectAction={handleSelectQuickAction}
      />

      <CommandPalette
        isOpen={isSearchPaletteOpen}
        onClose={() => setIsSearchPaletteOpen(false)}
        onNavigateTab={handleNavigate}
      />

      <EditPunchModal
        isOpen={editPunchModal.isOpen}
        onClose={() => setEditPunchModal((prev) => ({ ...prev, isOpen: false, punchToEdit: null }))}
        onSave={() => {
          // Dispara recarregamento
          window.dispatchEvent(new CustomEvent('timesheet-updated'));
        }}
        employeeId={editPunchModal.employeeId}
        punchToEdit={editPunchModal.punchToEdit}
        defaultDate={editPunchModal.defaultDate}
      />

      <AuditTrailModal
        isOpen={auditModal.isOpen}
        onClose={() => setAuditModal({ isOpen: false })}
        employeeId={auditModal.employeeId}
      />
    </div>
  );
}
