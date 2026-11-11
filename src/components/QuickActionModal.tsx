import React from 'react';
import {
  Clock,
  Fingerprint,
  CalendarX,
  UserPlus,
  FileText,
  Download,
  X
} from 'lucide-react';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'open-kiosk',
      title: 'Abrir Registro Quiosque (Tablet)',
      desc: 'Terminal público para colaboradores baterem ponto por CPF',
      icon: Fingerprint,
      color: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
    },
    {
      id: 'manual-punch',
      title: 'Ajuste Manual de Ponto (RH)',
      desc: 'Inserir ou corrigir marcação com justificativa legal',
      icon: Clock,
      color: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    },
    {
      id: 'new-absence',
      title: 'Lançar Atestado / Ausência',
      desc: 'Registrar atestado médico, consulta ou folga com abono',
      icon: CalendarX,
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    },
    {
      id: 'new-employee',
      title: 'Cadastrar Novo Colaborador',
      desc: 'Admissão de funcionário e vinculação de escala semanal',
      icon: UserPlus,
      color: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
    },
    {
      id: 'download-pdf',
      title: 'Baixar Espelho de Ponto (PDF A4 Paisagem)',
      desc: 'Gerar folha de ponto mensal homologada para assinatura',
      icon: FileText,
      color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
    },
    {
      id: 'export-excel',
      title: 'Exportar Fechamento em Excel (.xlsx)',
      desc: 'Planilha analítica com horas extras, atrasos e totais gerais',
      icon: Download,
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Ação Rápida</h2>
            <p className="text-xs text-slate-400">Atalhos rápidos para as principais tarefas operacionais</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  onSelectAction(act.id);
                  onClose();
                }}
                className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-center gap-3.5 text-left transition group"
              >
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${act.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-slate-400">{act.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
