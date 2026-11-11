import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Clock, CheckCircle2, ShieldCheck, Settings2 } from 'lucide-react';
import { ShiftSchedule } from '../types';
import { DAY_OF_WEEK_LABELS } from '../services/timeCalculationEngine';

export const SchedulesView: React.FC = () => {
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<ShiftSchedule | null>(null);
  const [savedNotification, setSavedNotification] = useState(false);

  const loadSchedules = () => {
    fetch('/api/schedules')
      .then((res) => res.json())
      .then((data) => {
        setSchedules(data);
        if (data.length > 0 && !selectedSchedule) {
          setSelectedSchedule(data[0]);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleUpdateSchedule = async (updates: Partial<ShiftSchedule>) => {
    if (!selectedSchedule) return;
    try {
      const res = await fetch(`/api/schedules/${selectedSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedSchedule(updated);
        setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setSavedNotification(true);
        setTimeout(() => setSavedNotification(false), 3000);
      }
    } catch (err) {
      console.error('Erro ao atualizar escala:', err);
    }
  };

  const handleDayChange = (dayIndex: number, field: string, value: any) => {
    if (!selectedSchedule) return;
    const currentDay = selectedSchedule.days[dayIndex] || { isOff: false, entry1: '', exit1: '', entry2: '', exit2: '' };
    const newDay = { ...currentDay, [field]: value };
    const newDays = { ...selectedSchedule.days, [dayIndex]: newDay };

    handleUpdateSchedule({ days: newDays });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Jornadas & Escalas de Trabalho</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configuração de horários, tolerâncias CLT Art. 58 § 1º e regras de adicionais de horas extras
          </p>
        </div>

        {savedNotification && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Configuração da escala salva com sucesso!</span>
          </div>
        )}
      </div>

      {/* Schedule Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {schedules.map((sch) => (
          <button
            key={sch.id}
            onClick={() => setSelectedSchedule(sch)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              selectedSchedule?.id === sch.id
                ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {sch.name} ({sch.weeklyHoursMinutes / 60}h semanais)
          </button>
        ))}
      </div>

      {selectedSchedule && (
        <div className="space-y-6">
          {/* General Scale Parameters */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Carga Horária Semanal</span>
              <div className="text-lg font-bold font-mono text-white">
                {selectedSchedule.weeklyHoursMinutes / 60} horas
              </div>
              <span className="text-[10px] text-slate-500">
                {selectedSchedule.weeklyHoursMinutes} minutos semanais
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Tolerância por Batida (CLT)</span>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {selectedSchedule.tolerancePunchMinutes} minutos
              </div>
              <span className="text-[10px] text-slate-500">Art. 58 § 1º da CLT</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Tolerância Máxima Diária</span>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {selectedSchedule.toleranceDailyMinutes} minutos
              </div>
              <span className="text-[10px] text-slate-500">Variações &gt; 10m contam integralmente</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Data de Vigência</span>
              <div className="text-sm font-semibold font-mono text-slate-200 mt-1">
                {selectedSchedule.effectiveFrom}
              </div>
              <span className="text-[10px] text-blue-400">Histórico de ponto preservado</span>
            </div>
          </div>

          {/* Overtime Policy Toggles */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-400" />
              <span>Regras de Horas Extras e DSR</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Sábado */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Sábado Gera Hora Extra?</span>
                  <input
                    type="checkbox"
                    checked={selectedSchedule.saturdayExtra}
                    onChange={(e) => handleUpdateSchedule({ saturdayExtra: e.target.checked })}
                    className="rounded border-slate-700 text-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>Adicional:</span>
                  <span className="font-mono font-bold text-white">{selectedSchedule.saturdayPercent}%</span>
                </div>
              </div>

              {/* Domingo */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Domingo Gera Hora Extra?</span>
                  <input
                    type="checkbox"
                    checked={selectedSchedule.sundayExtra}
                    onChange={(e) => handleUpdateSchedule({ sundayExtra: e.target.checked })}
                    className="rounded border-slate-700 text-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>Adicional (DSR):</span>
                  <span className="font-mono font-bold text-white">{selectedSchedule.sundayPercent}%</span>
                </div>
              </div>

              {/* Feriados */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Feriado Trabalhado?</span>
                  <input
                    type="checkbox"
                    checked={selectedSchedule.holidayExtra}
                    onChange={(e) => handleUpdateSchedule({ holidayExtra: e.target.checked })}
                    className="rounded border-slate-700 text-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>Adicional Feriado:</span>
                  <span className="font-mono font-bold text-white">{selectedSchedule.holidayPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Days of the Week Schedule Grid */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">Grade Semanal de Turnos</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Definição de horários de entrada, almoço e encerramento para cada dia da semana
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Dia da Semana</th>
                    <th className="py-3 px-4">Folga / DSR</th>
                    <th className="py-3 px-4">Entrada 1</th>
                    <th className="py-3 px-4">Saída Almoço (S1)</th>
                    <th className="py-3 px-4">Retorno Almoço (E2)</th>
                    <th className="py-3 px-4">Saída Fim Expediente (S2)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                    const day = selectedSchedule.days[dayIdx] || { isOff: false, entry1: '', exit1: '', entry2: '', exit2: '' };
                    return (
                      <tr key={dayIdx} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {DAY_OF_WEEK_LABELS[dayIdx]}
                        </td>

                        <td className="py-3 px-4">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                            <input
                              type="checkbox"
                              checked={day.isOff}
                              onChange={(e) => handleDayChange(dayIdx, 'isOff', e.target.checked)}
                              className="rounded border-slate-700 text-blue-600"
                            />
                            <span>{day.isOff ? 'Folga' : 'Trabalho'}</span>
                          </label>
                        </td>

                        <td className="py-3 px-4">
                          <input
                            type="time"
                            disabled={day.isOff}
                            value={day.entry1 || ''}
                            onChange={(e) => handleDayChange(dayIdx, 'entry1', e.target.value)}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono disabled:opacity-40"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <input
                            type="time"
                            disabled={day.isOff}
                            value={day.exit1 || ''}
                            onChange={(e) => handleDayChange(dayIdx, 'exit1', e.target.value)}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono disabled:opacity-40"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <input
                            type="time"
                            disabled={day.isOff}
                            value={day.entry2 || ''}
                            onChange={(e) => handleDayChange(dayIdx, 'entry2', e.target.value)}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono disabled:opacity-40"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <input
                            type="time"
                            disabled={day.isOff}
                            value={day.exit2 || ''}
                            onChange={(e) => handleDayChange(dayIdx, 'exit2', e.target.value)}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white font-mono disabled:opacity-40"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
