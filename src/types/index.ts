/**
 * Tipos e interfaces fundamentais para o PontoPro (Portaria MTP 671/2021 e CLT)
 */

export type UserRole = 'ADMIN' | 'COLABORADOR' | 'QUIOSQUE';

export type EmployeeStatus = 'ativo' | 'inativo';

export interface Employee {
  id: string;
  name: string;
  cpf: string; // Formatado com máscara 000.000.000-00
  birthDate: string; // YYYY-MM-DD
  role: string;
  department: string;
  admissionDate: string; // YYYY-MM-DD
  email: string;
  phone: string;
  shiftScheduleId: string;
  status: EmployeeStatus;
  pinCode?: string; // 4 dígitos para quiosque opcional
  photoUrl?: string;
  avatarInitials: string;
}

export interface DaySchedule {
  isOff: boolean;
  entry1: string; // HH:MM
  exit1: string; // HH:MM
  entry2: string; // HH:MM
  exit2: string; // HH:MM
}

export interface ShiftSchedule {
  id: string;
  name: string;
  weeklyHoursMinutes: number; // 2640 = 44h, 2520 = 42h
  effectiveFrom: string; // Data de vigência YYYY-MM-DD
  tolerancePunchMinutes: number; // Padrão CLT: 5 min
  toleranceDailyMinutes: number; // Padrão CLT: 10 min
  saturdayExtra: boolean;
  saturdayPercent: number; // ex: 50
  sundayExtra: boolean;
  sundayPercent: number; // ex: 100
  holidayExtra: boolean;
  holidayPercent: number; // ex: 100
  days: Record<number, DaySchedule>; // 0 = Domingo, 1 = Segunda ... 6 = Sábado
}

export type PunchType = 'E1' | 'S1' | 'E2' | 'S2' | 'E3' | 'S3';

export const PUNCH_TYPE_LABELS: Record<PunchType, string> = {
  E1: 'Entrada 1',
  S1: 'Saída Intervalo',
  E2: 'Retorno Intervalo',
  S2: 'Saída Fim de Expediente',
  E3: 'Entrada Turno Extra',
  S3: 'Saída Turno Extra',
};

export interface PunchRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  serverTimestamp: string; // ISO
  type: PunchType;
  origin: 'quiosque' | 'manual' | 'ajuste';
  nsr: number; // Número Sequencial de Registro (Portaria 671)
  ip: string;
  userAgent: string;
  isEdited: boolean;
  originalTime?: string;
  originalType?: PunchType;
  editReason?: string;
  editedBy?: string;
  editedAt?: string;
  photoDataUrl?: string;
  hash: string; // Hash SHA-256 para integridade
}

export interface AuditLog {
  id: string;
  punchId?: string;
  employeeId: string;
  changedBy: string;
  timestamp: string; // ISO
  previousValue?: string;
  newValue?: string;
  reason: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'REOPEN_MONTH' | 'CLOSE_MONTH';
  ip?: string;
}

export type AbsenceType = 'Atestado' | 'Declaração' | 'Consulta' | 'Folga' | 'Feriado' | 'Outros';

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  abonaHoras: boolean;
  observation: string;
  attachmentName?: string;
  status: 'aprovado' | 'pendente' | 'rejeitado';
  approvedBy?: string;
  approvedAt?: string;
}

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'nacional' | 'estadual' | 'municipal';
}

export interface DayCalculation {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0..6
  dayOfWeekLabel: string;
  scheduledMinutes: number;
  workedMinutes: number;
  balanceMinutes: number; // saldo do dia (pode ser positivo ou negativo)
  overtime50Minutes: number;
  overtime100Minutes: number;
  deficitMinutes: number;
  punches: PunchRecord[];
  isHoliday: boolean;
  holidayName?: string;
  isOffDay: boolean;
  isCompensatedByAbsence: boolean;
  absenceType?: AbsenceType;
  hasInconsistency: boolean;
  inconsistencyReason?: string;
}

export interface MonthCalculation {
  employee: Employee;
  competence: string; // YYYY-MM
  schedule: ShiftSchedule;
  days: DayCalculation[];
  totalScheduledMinutes: number;
  totalWorkedMinutes: number;
  totalOvertime50Minutes: number;
  totalOvertime100Minutes: number;
  totalDeficitMinutes: number;
  netBalanceMinutes: number;
  closed: boolean;
  closedAt?: string;
  closedBy?: string;
}

export interface MonthlyClosing {
  id: string;
  competence: string; // YYYY-MM
  closedAt?: string;
  closedBy?: string;
  status: 'aberto' | 'fechado';
  reopenReason?: string;
  reopenedBy?: string;
  reopenedAt?: string;
  totals: {
    totalWorkedMinutes: number;
    totalOvertime50Minutes: number;
    totalOvertime100Minutes: number;
    totalDeficitMinutes: number;
    employeesValidated: number;
    employeesTotal: number;
  };
}

export interface CompanySettings {
  name: string;
  tradeName: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  responsibleName: string;
  responsibleRole: string;
  timezone: string; // America/Sao_Paulo
}
