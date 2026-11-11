import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Download,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  Calendar,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { AuditLog, MonthlyClosing, UserRole } from '../types';
import { formatMinutesFriendly, formatMinutesToTime } from '../services/timeCalculationEngine';

interface ClosingViewProps {
  userRole: UserRole;
}

export const ClosingView: React.FC<ClosingViewProps> = ({ userRole }) => {
  const [competence, setCompetence] = useState('2024-10');
  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = () => {
    fetch('/api/dashboard/stats?competence=' + competence)
      .then((res) => res.json())
      .then((data) => {})
      .catch(console.error);

    fetch('/api/audit-logs')
      .then((res) => res.json())
      .then(setAuditLogs)
      .catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, [competence]);

  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReasonInput, setReopenReasonInput] = useState('');

  const executeCloseMonth = async () => {
    setShowConfirmClose(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/closing/${competence}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorName: 'Ana Clara Albuquerque (RH)' }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification(data.message);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const executeReopenMonth = async () => {
    if (!reopenReasonInput.trim()) return;
    setShowReopenModal(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/closing/${competence}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReasonInput, operatorName: 'Admin Geral' }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification(data.message);
        setReopenReasonInput('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadBatchZIP = () => {
    window.location.href = `/api/pdf/timesheet-batch/${competence}`;
  };

  const exportExcel = () => {
    window.location.href = `/api/export/excel/${competence}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Fechamento Mensal & Relatórios</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Homologação de competência, liquidação do banco de horas mensal e emissão de lotes em conformidade com a Portaria 671
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={competence}
            onChange={(e) => setCompetence(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-hidden"
          >
            <option value="2024-10">Outubro / 2024</option>
            <option value="2024-09">Setembro / 2024</option>
            <option value="2024-08">Agosto / 2024</option>
          </select>

          <button
            onClick={downloadBatchZIP}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 shadow-xs transition"
            title="Download de todos os espelhos de ponto em A4 Paisagem compactados em arquivo ZIP"
          >
            <FileArchive className="w-3.5 h-3.5 text-blue-400" />
            <span>Baixar Lote ZIP (PDFs)</span>
          </button>

          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Closing Status Card */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Status da Competência</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/60 text-amber-400 border border-amber-800/60">
                EM ABERTO
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Competência: {competence}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Período de apuração: 01/{competence.slice(5, 7)}/{competence.slice(0, 4)} a 31/{competence.slice(5, 7)}/{competence.slice(0, 4)}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowConfirmClose(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition active:scale-[0.98]"
            >
              <Lock className="w-4 h-4" />
              <span>Efetuar Fechamento Mensal</span>
            </button>

            {userRole === 'ADMIN' && (
              <button
                onClick={() => setShowReopenModal(true)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition"
                title="Apenas Admin com justificativa obrigatória"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>Reabrir Mês</span>
              </button>
            )}
          </div>
        </div>

        {/* Rules & Checkpoints */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="font-semibold text-slate-200 block">1. Regra de Banco de Horas Mensal</span>
            <p className="text-[11px] text-slate-400">
              Dentro do mês, débitos e créditos compensam-se. Ao fechar, o saldo positivo vira Horas Extras e o banco é zerado (nenhum saldo é transportado).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="font-semibold text-slate-200 block">2. Bloqueio de Edições</span>
            <p className="text-[11px] text-slate-400">
              Após o fechamento, as batidas são congeladas e novas inclusões só são permitidas mediante reabertura justificada em auditoria.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="font-semibold text-slate-200 block">3. Emissão de Folhas & Assinaturas</span>
            <p className="text-[11px] text-slate-400">
              Geração de PDFs individuais em A4 Paisagem com assinatura do empregado e empregador conforme Portaria MTP 671/2021.
            </p>
          </div>
        </div>
      </div>

      {/* Immutable Audit Log Table (Portaria 671) */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Trilha de Auditoria Imutável (Portaria MTP 671/2021)</h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Registros inalteráveis de alterações manuais, inclusões e reaberturas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Operador / Responsável</th>
                <th className="py-3 px-4">Tipo de Ação</th>
                <th className="py-3 px-4">Valor Anterior</th>
                <th className="py-3 px-4">Novo Valor</th>
                <th className="py-3 px-4">Justificativa Legal Obrigatória</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition text-[11px]">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-semibold font-sans">{log.changedBy}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 text-[10px]">
                      {log.actionType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-rose-400 font-mono">{log.previousValue || '-'}</td>
                  <td className="py-3 px-4 text-emerald-400 font-mono">{log.newValue || '-'}</td>
                  <td className="py-3 px-4 font-sans text-slate-300 max-w-sm break-words">
                    {log.reason}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    Nenhum registro de auditoria gerado até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Fechamento */}
      {showConfirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Lock className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Fechar Competência {competence}?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Esta ação calculará e congelará os totais do mês, liquidará o <strong>Banco de Horas Mensal</strong> (convertendo o saldo credor em Horas Extras a pagar) e bloqueará novas edições nas folhas de ponto.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowConfirmClose(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={executeCloseMonth}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs"
              >
                {loading ? 'Fechando...' : 'Confirmar Fechamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reabertura com Justificativa Legal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Unlock className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">Reabrir Competência {competence}</h3>
                <span className="text-[11px] text-slate-400">Apenas administradores com justificativa auditada</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Justificativa Legal Obrigatória (Portaria MTP 671/2021) *
              </label>
              <textarea
                rows={3}
                required
                value={reopenReasonInput}
                onChange={(e) => setReopenReasonInput(e.target.value)}
                placeholder="Ex: Necessidade de homologação tardia de atestado médico com autorização da diretoria..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowReopenModal(false);
                  setReopenReasonInput('');
                }}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={executeReopenMonth}
                disabled={loading || !reopenReasonInput.trim()}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs"
              >
                {loading ? 'Reabrindo...' : 'Reabrir Competência'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
