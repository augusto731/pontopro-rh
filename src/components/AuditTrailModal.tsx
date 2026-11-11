import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, X } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  isOpen,
  onClose,
  employeeId,
}) => {
  if (!isOpen) return null;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = employeeId ? `/api/audit-logs?employeeId=${employeeId}` : '/api/audit-logs';
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [employeeId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-white">Trilha de Auditoria (Portaria MTP 671/2021)</h2>
              <p className="text-xs text-slate-400">Histórico completo de alterações manuais e ocorrências</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 font-semibold text-slate-200">
                  {log.actionType}
                </span>
              </div>

              <div className="text-slate-200">
                <span className="text-slate-500">Responsável: </span>
                <strong className="text-white">{log.changedBy}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] p-2 rounded bg-slate-900/60 border border-slate-800/60">
                <div>
                  <span className="text-rose-400 block text-[10px] uppercase font-sans">Anterior:</span>
                  <span className="text-slate-300">{log.previousValue || '[Nenhum]'}</span>
                </div>
                <div>
                  <span className="text-emerald-400 block text-[10px] uppercase font-sans">Novo Valor:</span>
                  <span className="text-slate-200 font-bold">{log.newValue}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800/60">
                <span className="text-amber-400 font-semibold">Justificativa Legal: </span>
                <span>{log.reason}</span>
              </div>
            </div>
          ))}

          {logs.length === 0 && !loading && (
            <div className="py-8 text-center text-slate-500">
              Nenhum apontamento ou auditoria registrado para este colaborador.
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
