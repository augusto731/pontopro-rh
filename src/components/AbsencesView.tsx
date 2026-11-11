import React, { useState, useEffect } from 'react';
import {
  CalendarX,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  Check,
  AlertCircle
} from 'lucide-react';
import { Absence, AbsenceType, Employee, UserRole } from '../types';

interface AbsencesViewProps {
  userRole: UserRole;
}

export const AbsencesView: React.FC<AbsencesViewProps> = ({ userRole }) => {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<AbsenceType>('Atestado');
  const [startDate, setStartDate] = useState('2024-10-25');
  const [endDate, setEndDate] = useState('2024-10-25');
  const [abonaHoras, setAbonaHoras] = useState(true);
  const [observation, setObservation] = useState('');
  const [attachmentName, setAttachmentName] = useState('atestado_medico.pdf');

  const loadData = () => {
    fetch('/api/absences')
      .then((res) => res.json())
      .then(setAbsences)
      .catch(console.error);

    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => {
        setEmployees(data);
        if (data.length > 0 && !employeeId) setEmployeeId(data[0].id);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          type,
          startDate,
          endDate,
          abonaHoras,
          observation,
          attachmentName,
          operatorName: 'RH Admin',
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setObservation('');
        loadData();
      }
    } catch (err) {
      console.error('Erro ao registrar ausência:', err);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'aprovado' | 'rejeitado') => {
    try {
      const res = await fetch(`/api/absences/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, operatorName: 'RH Admin' }),
      });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Gestão de Ausências & Atestados</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Lançamento de atestados médicos, declarações, licenças e controle de abono de jornada
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Lançar Ausência / Atestado</span>
        </button>
      </div>

      {/* Absences Table */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Período (Início / Fim)</th>
                <th className="py-3 px-4">Abona Horas?</th>
                <th className="py-3 px-4">Observações</th>
                <th className="py-3 px-4">Anexo</th>
                <th className="py-3 px-4">Status</th>
                {userRole === 'ADMIN' && <th className="py-3 px-4 text-right">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {absences.map((abs) => {
                const emp = employees.find((e) => e.id === abs.employeeId);
                const isApproved = abs.status === 'aprovado';
                const isPending = abs.status === 'pendente';

                return (
                  <tr key={abs.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{emp?.name || 'Colaborador'}</div>
                      <div className="text-[11px] text-slate-400">{emp?.role}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-200 border border-slate-700/60">
                        {abs.type}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {abs.startDate} {abs.startDate !== abs.endDate && `até ${abs.endDate}`}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          abs.abonaHoras ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {abs.abonaHoras ? 'Sim (Abonado)' : 'Não (Descontado)'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {abs.observation || 'Sem observações'}
                    </td>

                    <td className="py-3 px-4">
                      {abs.attachmentName ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 font-mono">
                          <Paperclip className="w-3 h-3" />
                          <span>{abs.attachmentName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isApproved
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            : isPending
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isApproved ? 'bg-emerald-400' : isPending ? 'bg-amber-400' : 'bg-rose-400'
                          }`}
                        ></span>
                        <span className="capitalize">{abs.status}</span>
                      </span>
                    </td>

                    {userRole === 'ADMIN' && (
                      <td className="py-3 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateStatus(abs.id, 'aprovado')}
                              className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[11px] font-medium"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(abs.id, 'rejeitado')}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-[11px]"
                            >
                              Recusar
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Homologado</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {absences.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhuma ausência registrada até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lançar Ausência */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Lançar Ausência / Atestado</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAbsence} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Colaborador *</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tipo de Ausência *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AbsenceType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Atestado">Atestado Médico</option>
                  <option value="Declaração">Declaração de Comparecimento</option>
                  <option value="Consulta">Consulta Médica</option>
                  <option value="Folga">Folga Compensatória</option>
                  <option value="Feriado">Feriado Local</option>
                  <option value="Outros">Outras Licenças (Casamento, Luto, etc.)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Data Inicial *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Data Final *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Abonar Horas do Período?</span>
                  <span className="text-[11px] text-slate-400">
                    Se marcado, a jornada prevista do dia não gerará débito/atraso.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={abonaHoras}
                  onChange={(e) => setAbonaHoras(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 w-4 h-4"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Observações / CID / Motivo</label>
                <textarea
                  rows={2}
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Ex: Consulta odontológica das 14:00 às 16:00..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nome do Anexo (Comprovante / Atestado)</label>
                <input
                  type="text"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="Ex: atestado_2410.pdf"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
                >
                  Lançar Ausência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
