/**
 * Motor de Cálculo de Jornada de Trabalho, Horas Extras, Tolerâncias CLT e Banco de Horas Mensal
 * Em estrita conformidade com a CLT (Art. 58 § 1º, Art. 59, Art. 71) e Portaria MTP 671/2021.
 */

import {
  Absence,
  DayCalculation,
  Employee,
  Holiday,
  MonthCalculation,
  PunchRecord,
  ShiftSchedule,
} from '../types';

export const DAY_OF_WEEK_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const DAY_OF_WEEK_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Converte "HH:MM" ou "HH:MM:SS" em minutos a partir da meia-noite
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Converte minutos em formato "HH:MM" ou "-HH:MM"
 */
export function formatMinutesToTime(minutes: number): string {
  const isNegative = minutes < 0;
  const absMin = Math.abs(minutes);
  const hours = Math.floor(absMin / 60);
  const mins = absMin % 60;
  const sign = isNegative ? '-' : '';
  return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Converte minutos em formato amigável "242h 30m"
 */
export function formatMinutesFriendly(minutes: number): string {
  const isNegative = minutes < 0;
  const absMin = Math.abs(minutes);
  const hours = Math.floor(absMin / 60);
  const mins = absMin % 60;
  const sign = isNegative ? '-' : '';
  if (mins === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h ${String(mins).padStart(2, '0')}m`;
}

/**
 * Validação algorítmica de CPF brasileiro (dígitos verificadores)
 */
export function validateCPF(rawCpf: string): boolean {
  const clean = rawCpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false; // CPFs com todos dígitos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Formata CPF para 000.000.000-00
 */
export function formatCPF(rawCpf: string): string {
  const clean = rawCpf.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

/**
 * Mascara CPF para comprovantes de ponto (ex: ***.456.789-**)
 */
export function maskPartialCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
}

/**
 * Calcula a jornada prevista em minutos para um dia de escala
 */
export function getScheduledMinutesForDay(schedule: ShiftSchedule, dayOfWeek: number): number {
  const dayConfig = schedule.days[dayOfWeek];
  if (!dayConfig || dayConfig.isOff) return 0;

  let total = 0;
  if (dayConfig.entry1 && dayConfig.exit1) {
    const e1 = parseTimeToMinutes(dayConfig.entry1);
    const s1 = parseTimeToMinutes(dayConfig.exit1);
    total += Math.max(0, s1 - e1);
  }
  if (dayConfig.entry2 && dayConfig.exit2) {
    const e2 = parseTimeToMinutes(dayConfig.entry2);
    const s2 = parseTimeToMinutes(dayConfig.exit2);
    total += Math.max(0, s2 - e2);
  }
  return total;
}

/**
 * Calcula os minutos efetivamente trabalhados em um array ordenado de batidas.
 * Pareia E1 com S1, E2 com S2, E3 com S3, etc.
 * Suporta jornadas noturnas caso Saída < Entrada (soma 24h = 1440 min).
 */
export function calculateWorkedMinutes(punches: PunchRecord[]): {
  workedMinutes: number;
  intervalMinutes: number;
  hasOddPunches: boolean;
} {
  if (!punches || punches.length === 0) {
    return { workedMinutes: 0, intervalMinutes: 0, hasOddPunches: false };
  }

  // Ordena por horário
  const sorted = [...punches].sort((a, b) => a.time.localeCompare(b.time));
  const hasOddPunches = sorted.length % 2 !== 0;

  let worked = 0;
  let interval = 0;

  for (let i = 0; i < sorted.length - 1; i += 2) {
    const entryMin = parseTimeToMinutes(sorted[i].time);
    let exitMin = parseTimeToMinutes(sorted[i + 1].time);
    if (exitMin < entryMin) {
      // Jornada que vira a meia-noite
      exitMin += 1440;
    }
    worked += Math.max(0, exitMin - entryMin);

    // Calcula intervalo entre o par atual e o próximo par de entrada
    if (i + 2 < sorted.length) {
      const nextEntryMin = parseTimeToMinutes(sorted[i + 2].time);
      let exitRef = parseTimeToMinutes(sorted[i + 1].time);
      if (nextEntryMin < exitRef) exitRef -= 1440;
      interval += Math.max(0, nextEntryMin - exitRef);
    }
  }

  return { workedMinutes: worked, intervalMinutes: interval, hasOddPunches };
}

/**
 * Calcula a linha de ponto de um dia específico
 */
export function calculateDay(
  dateStr: string,
  punches: PunchRecord[],
  schedule: ShiftSchedule,
  holidays: Holiday[],
  absences: Absence[]
): DayCalculation {
  // Parse date
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = dateObj.getUTCDay(); // 0 = Domingo .. 6 = Sábado

  const daySchedule = schedule.days[dayOfWeek];
  const isOffDay = !daySchedule || daySchedule.isOff;

  // Verifica se é feriado
  const holiday = holidays.find((h) => h.date === dateStr);
  const isHoliday = !!holiday;

  // Verifica se há ausência registrada
  const activeAbsence = absences.find((a) => {
    return (
      a.status === 'aprovado' &&
      dateStr >= a.startDate &&
      dateStr <= a.endDate
    );
  });

  const scheduledMinutes = isHoliday ? 0 : isOffDay ? 0 : getScheduledMinutesForDay(schedule, dayOfWeek);

  const { workedMinutes, intervalMinutes, hasOddPunches } = calculateWorkedMinutes(punches);

  let hasInconsistency = false;
  let inconsistencyReason: string | undefined = undefined;

  // 1. Batida ímpar
  if (hasOddPunches) {
    hasInconsistency = true;
    inconsistencyReason = 'Batida ímpar / marcação incompleta';
  }

  // 2. Intervalo intrajornada (CLT Art. 71: jornadas > 6h exigem no mínimo 1h de intervalo)
  if (scheduledMinutes > 360 && punches.length >= 4 && intervalMinutes < 60) {
    hasInconsistency = true;
    inconsistencyReason = `Intervalo intrajornada de ${intervalMinutes}min inferior ao mínimo legal de 60min (CLT art. 71)`;
  }

  // 3. Limite de jornada diária de 10 horas (CLT Art. 59)
  if (workedMinutes > 600) {
    hasInconsistency = true;
    inconsistencyReason = `Jornada trabalhada de ${formatMinutesFriendly(workedMinutes)} excedeu o limite máximo de 10h diárias (CLT art. 59)`;
  }

  // Tratamento de ausência que abona
  const isCompensatedByAbsence = !!(activeAbsence && activeAbsence.abonaHoras);

  let effectiveScheduled = scheduledMinutes;
  if (isCompensatedByAbsence) {
    effectiveScheduled = 0; // Abona integralmente a jornada do dia
  }

  // Diferença bruta entre o trabalhado e o previsto
  const rawDiff = workedMinutes - effectiveScheduled;

  // Aplicação da Tolerância CLT Art. 58 § 1º:
  // "Não serão descontadas nem computadas como jornada extraordinária as variações de horário
  // no registro de ponto não excedentes de cinco minutos, observado o limite máximo de dez minutos diários."
  const toleranceLimit = schedule.toleranceDailyMinutes || 10;
  let balanceMinutes = 0;

  if (Math.abs(rawDiff) <= toleranceLimit) {
    // Dentro da tolerância diária: nenhum acréscimo nem desconto
    balanceMinutes = 0;
  } else {
    // Excedeu a tolerância: computa integralmente!
    balanceMinutes = rawDiff;
  }

  let overtime50Minutes = 0;
  let overtime100Minutes = 0;
  let deficitMinutes = 0;

  if (balanceMinutes > 0) {
    // Horas extras
    if (dayOfWeek === 0 || isHoliday) {
      // Domingo ou Feriado: 100% adicional
      overtime100Minutes = balanceMinutes;
    } else if (dayOfWeek === 6) {
      // Sábado
      if (schedule.saturdayExtra) {
        if (schedule.saturdayPercent === 100) {
          overtime100Minutes = balanceMinutes;
        } else {
          overtime50Minutes = balanceMinutes;
        }
      } else {
        overtime50Minutes = balanceMinutes;
      }
    } else {
      // Dias normais de semana
      overtime50Minutes = balanceMinutes;
    }
  } else if (balanceMinutes < 0) {
    deficitMinutes = Math.abs(balanceMinutes);
  }

  // Se dia normal de trabalho não teve batidas e não tem ausência abonada
  if (!isOffDay && !isHoliday && punches.length === 0 && !isCompensatedByAbsence) {
    hasInconsistency = true;
    inconsistencyReason = 'Falta de registro no dia de expediente';
  }

  return {
    date: dateStr,
    dayOfWeek,
    dayOfWeekLabel: DAY_OF_WEEK_LABELS[dayOfWeek],
    scheduledMinutes,
    workedMinutes,
    balanceMinutes,
    overtime50Minutes,
    overtime100Minutes,
    deficitMinutes,
    punches,
    isHoliday,
    holidayName: holiday?.name,
    isOffDay,
    isCompensatedByAbsence,
    absenceType: activeAbsence?.type,
    hasInconsistency,
    inconsistencyReason,
  };
}

/**
 * Calcula a competência mensal de um colaborador (dia 1 ao último dia do mês)
 * Executa a regra do BANCO DE HORAS MENSAL:
 * - Dentro do mês, atrasos e horas extras compensam-se mutuamente.
 * - Ao fechar o mês, o saldo positivo vira Horas Extras a pagar e o banco é zerado (sem transporte).
 */
export function calculateMonth(
  employee: Employee,
  competence: string, // YYYY-MM
  schedule: ShiftSchedule,
  punches: PunchRecord[],
  holidays: Holiday[],
  absences: Absence[],
  isClosed: boolean = false,
  closedAt?: string,
  closedBy?: string
): MonthCalculation {
  const [yearStr, monthStr] = competence.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Determina número de dias no mês
  const daysInMonth = new Date(year, month, 0).getDate();

  const days: DayCalculation[] = [];
  let totalScheduled = 0;
  let totalWorked = 0;
  let totalOvertime50 = 0;
  let totalOvertime100 = 0;
  let totalDeficit = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${yearStr}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayPunches = punches.filter((p) => p.date === dayStr && p.employeeId === employee.id);
    const dayEmployeeAbsences = absences.filter((a) => a.employeeId === employee.id);

    const calc = calculateDay(dayStr, dayPunches, schedule, holidays, dayEmployeeAbsences);
    days.push(calc);

    totalScheduled += calc.scheduledMinutes;
    totalWorked += calc.workedMinutes;
    totalOvertime50 += calc.overtime50Minutes;
    totalOvertime100 += calc.overtime100Minutes;
    totalDeficit += calc.deficitMinutes;
  }

  // Banco de Horas Mensal: saldo líquido do mês
  const netBalanceMinutes = totalWorked - totalScheduled;

  return {
    employee,
    competence,
    schedule,
    days,
    totalScheduledMinutes: totalScheduled,
    totalWorkedMinutes: totalWorked,
    totalOvertime50Minutes: totalOvertime50,
    totalOvertime100Minutes: totalOvertime100,
    totalDeficitMinutes: totalDeficit,
    netBalanceMinutes,
    closed: isClosed,
    closedAt,
    closedBy,
  };
}
