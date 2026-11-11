import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  AlertTriangle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  History,
  CheckCircle2,
  Calendar,
  User,
  Check
} from 'lucide-react';
import { Employee, MonthCalculation, PunchRecord, UserRole } from '../types';
import { formatMinutesFriendly, formatMinutesToTime } from '../services/timeCalculationEngine';

interface TimesheetViewProps {
  userRole: UserRole;
  selectedEmployeeId?: string;
  onOpenManualPunch: (empId: string, dateStr?: string) => void;
  onOpenEditPunch: (punch: PunchRecord) => void;
  onOpenAuditTrail: (empId: string) => void;
}

export const TimesheetView: React.FC<TimesheetViewProps> = ({
  userRole,
  selectedEmployeeId = 'emp-gf',
  onOpenManualPunch,
  onOpenEditPunch,
  onOpenAuditTrail,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeEmpId, setActiveEmpId] = useState<string>(selectedEmployeeId);
  const [competence, setCompetence] = useState<string>('2024-10');
  const [calculation, setCalculation] = useState<MonthCalculation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Carrega lista de colaboradores
  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => {
        setEmployees(data);
        if (data.length > 0 && !activeEmpId) {
          setActiveEmpId(data[0].id);
        }
      })
      .catch((err) => console.error('Erro ao carregar colaboradores:', err));
  }, []);

  // Carrega espelho calculado
  const fetchTimesheet = () => {
    if (!activeEmpId) return;
    setLoading(true);
    fetch(`/api/timesheet/${activeEmpId}/${competence}`)
      .then((res) => res.json())
      .then((data) => {
        setCalculation(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erro ao carregar espelho:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTimesheet();
  }, [activeEmpId, competence]);

  // Se colaborador estiver logado, trava no perfil dele
  const isColaborador = userRole === 'COLABORADOR';

  const downloadPDF = () => {
    if (!activeEmpId) return;
    const a = document.createElement('a');
    a.href = `/api/pdf/timesheet/${activeEmpId}/${competence}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportExcel = () => {
    window.location.href = `/api/export/excel/${competence}`;
  };

  // Identifica se há dias com inconsistências
  const inconsistencies = calculation?.days.filter((d) => d.hasInconsistency) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls: Selector & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Colaborador */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Colaborador</label>
            <select
              value={activeEmpId}
              disabled={isColaborador}
              onChange={(e) => setActiveEmpId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium focus:outline-hidden focus:border-blue-500 disabled:opacity-70"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.role} ({emp.department})
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Competência */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Competência (Mês/Ano)</label>
            <select
              value={competence}
              onChange={(e) => setCompetence(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium focus:outline-hidden focus:border-blue-500 font-mono"
            >
              <option value="2024-10">Outubro / 2024 (Competência Vigente)</option>
              <option value="2024-09">Setembro / 2024 (Fechada)</option>
              <option value="2024-11">Novembro / 2024 (Escala 42h)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {userRole === 'ADMIN' && (
            <button
              onClick={() => onOpenManualPunch(activeEmpId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajuste Manual RH</span>
            </button>
          )}

          <button
            onClick={() => onOpenAuditTrail(activeEmpId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 text-xs font-medium transition"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Auditoria Portaria 671</span>
          </button>

          <button
            onClick={downloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 text-xs font-medium transition"
            title="Download do Espelho de Ponto em formato A4 Paisagem homologado"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>PDF A4 Paisagem</span>
          </button>

          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Inconsistency Alert Banner */}
      {inconsistencies.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-300">
              Atenção: {inconsistencies.length} dia(s) com apontamentos ou inconsistências nesta competência
            </div>
            <div className="text-[11px] text-amber-400">
              Foram identificadas batidas ímpares, faltas de registro ou violação de intervalo intrajornada (CLT art. 71).
              O RH pode realizar o ajuste manual com justificativa antes do fechamento mensal.
            </div>
          </div>
        </div>
      )}

      {/* Employee & Shift Metadata Strip */}
      {calculation && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Previsto no Mês</span>
            <div className="text-base font-bold font-mono text-white mt-0.5">
              {formatMinutesToTime(calculation.totalScheduledMinutes)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Trabalhado Real</span>
            <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
              {formatMinutesToTime(calculation.totalWorkedMinutes)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Horas Extras 50%</span>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {formatMinutesToTime(calculation.totalOvertime50Minutes)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Horas Extras 100%</span>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {formatMinutesToTime(calculation.totalOvertime100Minutes)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Atrasos / Faltas</span>
            <div className="text-base font-bold font-mono text-rose-400 mt-0.5">
              {formatMinutesToTime(calculation.totalDeficitMinutes)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Banco Mensal Líquido</span>
            <div className={`text-base font-bold font-mono mt-0.5 ${calculation.netBalanceMinutes >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
              {(calculation.netBalanceMinutes >= 0 ? '+' : '') + formatMinutesToTime(calculation.netBalanceMinutes)}
            </div>
          </div>
        </div>
      )}

      {/* Main Timesheet Table */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Espelho de Ponto Individual (Diário)</h2>
            <span className="text-xs text-slate-400 font-mono">
              Escala: {calculation?.schedule.name} • Tolerância CLT Art. 58 §1º aplicada
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            * = Batida manual / ajustada com justificativa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Dia</th>
                <th className="py-2.5 px-2">Sem</th>
                <th className="py-2.5 px-3">Marcações Realizadas (Ordem Cronológica)</th>
                <th className="py-2.5 px-3 text-right">Previsto</th>
                <th className="py-2.5 px-3 text-right">Trabalhado</th>
                <th className="py-2.5 px-3 text-right">HE 50%</th>
                <th className="py-2.5 px-3 text-right">HE 100%</th>
                <th className="py-2.5 px-3 text-right">Atraso</th>
                <th className="py-2.5 px-3">Ocorrência / Observação</th>
                {userRole === 'ADMIN' && <th className="py-2.5 px-3 text-right">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {calculation?.days.map((day) => {
                const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
                const hasPunches = day.punches.length > 0;

                return (
                  <tr
                    key={day.date}
                    className={`transition hover:bg-slate-800/40 ${
                      day.hasInconsistency
                        ? 'bg-rose-950/20'
                        : day.isHoliday
                        ? 'bg-amber-950/15'
                        : isWeekend
                        ? 'bg-slate-950/30'
                        : ''
                    }`}
                  >
                    {/* Dia */}
                    <td className="py-2 px-3 font-mono font-medium text-slate-300">
                      {day.date.slice(8, 10)}
                    </td>

                    {/* Sem */}
                    <td className="py-2 px-2 text-slate-400 text-[11px]">
                      {day.dayOfWeekLabel.slice(0, 3)}
                    </td>

                    {/* Batidas */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hasPunches ? (
                          day.punches.map((p) => (
                            <span
                              key={p.id}
                              onClick={() => userRole === 'ADMIN' && onOpenEditPunch(p)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] transition ${
                                userRole === 'ADMIN' ? 'cursor-pointer hover:border-blue-400' : ''
                              } ${
                                p.isEdited
                                  ? 'bg-amber-950/60 border border-amber-700/60 text-amber-200'
                                  : 'bg-slate-800/90 border border-slate-700/60 text-slate-200'
                              }`}
                              title={
                                p.isEdited
                                  ? `Editado por ${p.editedBy || 'RH'}: ${p.editReason}`
                                  : `Batida original NSR: ${p.nsr}`
                              }
                            >
                              <span className="text-[10px] text-slate-400 font-sans">{p.type}</span>
                              <span className="font-semibold">{p.time.slice(0, 5)}</span>
                              {p.isEdited && <span className="text-amber-400 font-bold">*</span>}
                            </span>
                          ))
                        ) : day.isHoliday ? (
                          <span className="text-amber-400 text-[11px] font-medium">
                            Feriado ({day.holidayName})
                          </span>
                        ) : day.isOffDay ? (
                          <span className="text-slate-400 text-[11px]">Folga / DSR</span>
                        ) : day.isCompensatedByAbsence ? (
                          <span className="text-blue-400 text-[11px] font-medium">
                            Ausência Abonada ({day.absenceType})
                          </span>
                        ) : (
                          <span className="text-rose-400 text-[11px] font-medium">Sem registro</span>
                        )}
                      </div>
                    </td>

                    {/* Previsto */}
                    <td className="py-2 px-3 text-right font-mono text-slate-400">
                      {day.scheduledMinutes > 0 ? formatMinutesToTime(day.scheduledMinutes) : '-'}
                    </td>

                    {/* Trabalhado */}
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-200">
                      {day.workedMinutes > 0 ? formatMinutesToTime(day.workedMinutes) : '-'}
                    </td>

                    {/* HE 50% */}
                    <td className="py-2 px-3 text-right font-mono text-emerald-400 font-medium">
                      {day.overtime50Minutes > 0 ? formatMinutesToTime(day.overtime50Minutes) : '-'}
                    </td>

                    {/* HE 100% */}
                    <td className="py-2 px-3 text-right font-mono text-emerald-400 font-medium">
                      {day.overtime100Minutes > 0 ? formatMinutesToTime(day.overtime100Minutes) : '-'}
                    </td>

                    {/* Atraso */}
                    <td className="py-2 px-3 text-right font-mono text-rose-400 font-medium">
                      {day.deficitMinutes > 0 ? formatMinutesToTime(day.deficitMinutes) : '-'}
                    </td>

                    {/* Ocorrência */}
                    <td className="py-2 px-3 text-[11px]">
                      {day.hasInconsistency ? (
                        <span className="text-rose-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{day.inconsistencyReason}</span>
                        </span>
                      ) : day.isCompensatedByAbsence ? (
                        <span className="text-blue-300">Atestado médico abonado</span>
                      ) : day.punches.some((p) => p.isEdited) ? (
                        <span className="text-amber-400">Batida ajustada pelo RH</span>
                      ) : (
                        <span className="text-slate-400">Normal</span>
                      )}
                    </td>

                    {/* Ação (RH) */}
                    {userRole === 'ADMIN' && (
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => onOpenManualPunch(activeEmpId, day.date)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition"
                          title="Inserir batida manual para este dia"
                        >
                          + Batida
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
