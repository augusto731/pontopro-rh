/**
 * Camada de Persistência e Dados com Integridade e Trilha de Auditoria (Portaria 671/2021)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Absence,
  AuditLog,
  CompanySettings,
  Employee,
  Holiday,
  MonthlyClosing,
  PunchRecord,
  ShiftSchedule,
} from '../types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'ponto_data.json');

export interface DatabaseState {
  company: CompanySettings;
  employees: Employee[];
  schedules: ShiftSchedule[];
  punches: PunchRecord[];
  absences: Absence[];
  holidays: Holiday[];
  auditLogs: AuditLog[];
  closings: MonthlyClosing[];
  nextNsr: number;
}

// Escalas Padrão
const DEFAULT_SCHEDULES: ShiftSchedule[] = [
  {
    id: 'sch-44h',
    name: 'Escala 44h Padrão Administrativa',
    weeklyHoursMinutes: 2640,
    effectiveFrom: '2024-01-01',
    tolerancePunchMinutes: 5,
    toleranceDailyMinutes: 10,
    saturdayExtra: true,
    saturdayPercent: 50,
    sundayExtra: true,
    sundayPercent: 100,
    holidayExtra: true,
    holidayPercent: 100,
    days: {
      0: { isOff: true, entry1: '', exit1: '', entry2: '', exit2: '' }, // Dom
      1: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' }, // 9h
      2: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' }, // 9h
      3: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' }, // 9h
      4: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' }, // 9h
      5: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '17:00' }, // 8h = 44h
      6: { isOff: true, entry1: '', exit1: '', entry2: '', exit2: '' }, // Sáb
    },
  },
  {
    id: 'sch-42h',
    name: 'Escala 42h Operacional (Nova Legislação)',
    weeklyHoursMinutes: 2520,
    effectiveFrom: '2024-11-01',
    tolerancePunchMinutes: 5,
    toleranceDailyMinutes: 10,
    saturdayExtra: true,
    saturdayPercent: 50,
    sundayExtra: true,
    sundayPercent: 100,
    holidayExtra: true,
    holidayPercent: 100,
    days: {
      0: { isOff: true, entry1: '', exit1: '', entry2: '', exit2: '' },
      1: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '17:24' },
      2: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '17:24' },
      3: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '17:24' },
      4: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '17:24' },
      5: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '17:24' },
      6: { isOff: true, entry1: '', exit1: '', entry2: '', exit2: '' },
    },
  },
];

// Colaboradores fiéis ao design do Stitch
const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-gf',
    name: 'Gabriel Ferreira',
    cpf: '123.456.789-01',
    birthDate: '1992-06-15',
    role: 'Dev Backend',
    department: 'Engenharia & Produto',
    admissionDate: '2022-02-10',
    email: 'gabriel.ferreira@acme.com.br',
    phone: '(11) 98765-4321',
    shiftScheduleId: 'sch-44h',
    status: 'ativo',
    pinCode: '1234',
    avatarInitials: 'GF',
  },
  {
    id: 'emp-pl',
    name: 'Patrícia Lima',
    cpf: '234.567.890-12',
    birthDate: '1995-11-20',
    role: 'Product Designer',
    department: 'Engenharia & Produto',
    admissionDate: '2021-08-01',
    email: 'patricia.lima@acme.com.br',
    phone: '(11) 97654-3210',
    shiftScheduleId: 'sch-44h',
    status: 'ativo',
    pinCode: '2345',
    avatarInitials: 'PL',
  },
  {
    id: 'emp-tm',
    name: 'Thiago Mansur',
    cpf: '345.678.901-23',
    birthDate: '1988-04-12',
    role: 'Analista Fiscal',
    department: 'Financeiro',
    admissionDate: '2020-05-15',
    email: 'thiago.mansur@acme.com.br',
    phone: '(11) 96543-2109',
    shiftScheduleId: 'sch-44h',
    status: 'ativo',
    pinCode: '3456',
    avatarInitials: 'TM',
  },
  {
    id: 'emp-jc',
    name: 'Juliana Costa',
    cpf: '456.789.012-34',
    birthDate: '1990-09-08',
    role: 'Gerente de Operações',
    department: 'Operações & Suporte',
    admissionDate: '2019-11-01',
    email: 'juliana.costa@acme.com.br',
    phone: '(11) 95432-1098',
    shiftScheduleId: 'sch-42h',
    status: 'ativo',
    pinCode: '4567',
    avatarInitials: 'JC',
  },
  {
    id: 'emp-ra',
    name: 'Rodrigo Alves',
    cpf: '567.890.123-45',
    birthDate: '1994-01-25',
    role: 'Executivo Comercial',
    department: 'Comercial & Expansão',
    admissionDate: '2023-01-15',
    email: 'rodrigo.alves@acme.com.br',
    phone: '(11) 94321-0987',
    shiftScheduleId: 'sch-44h',
    status: 'ativo',
    pinCode: '5678',
    avatarInitials: 'RA',
  },
];

// Feriados Nacionais
const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: 'h-01', date: '2024-01-01', name: 'Confraternização Universal', type: 'nacional' },
  { id: 'h-02', date: '2024-02-12', name: 'Carnaval', type: 'nacional' },
  { id: 'h-03', date: '2024-02-13', name: 'Carnaval', type: 'nacional' },
  { id: 'h-04', date: '2024-03-29', name: 'Paixão de Cristo', type: 'nacional' },
  { id: 'h-05', date: '2024-04-21', name: 'Tiradentes', type: 'nacional' },
  { id: 'h-06', date: '2024-05-01', name: 'Dia Mundial do Trabalho', type: 'nacional' },
  { id: 'h-07', date: '2024-05-30', name: 'Corpus Christi', type: 'nacional' },
  { id: 'h-08', date: '2024-09-07', name: 'Independência do Brasil', type: 'nacional' },
  { id: 'h-09', date: '2024-10-12', name: 'Nossa Senhora Aparecida', type: 'nacional' },
  { id: 'h-10', date: '2024-11-02', name: 'Finados', type: 'nacional' },
  { id: 'h-11', date: '2024-11-15', name: 'Proclamação da República', type: 'nacional' },
  { id: 'h-12', date: '2024-11-20', name: 'Dia Nacional de Zumbi e da Consciência Negra', type: 'nacional' },
  { id: 'h-13', date: '2024-12-25', name: 'Natal', type: 'nacional' },
];

function generateInitialPunches(): PunchRecord[] {
  const punches: PunchRecord[] = [];
  let nsr = 10001;

  // Vamos gerar marcações para o mês de Outubro/2024 (dia 1 a 24)
  // para simular exatamente o dia 24 de Outubro, 2024 da imagem do Stitch
  const days = [
    '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04',
    '2024-10-07', '2024-10-08', '2024-10-09', '2024-10-10', '2024-10-11',
    '2024-10-14', '2024-10-15', '2024-10-16', '2024-10-17', '2024-10-18',
    '2024-10-21', '2024-10-22', '2024-10-23', '2024-10-24'
  ];

  DEFAULT_EMPLOYEES.forEach((emp) => {
    days.forEach((date) => {
      // Caso especial 1 (Mockup Stitch): Gabriel Ferreira em 23/10 tem "Esquecimento Saída" (batida ímpar)
      if (emp.id === 'emp-gf' && date === '2024-10-23') {
        punches.push(
          { id: `p-${nsr}`, employeeId: emp.id, date, time: '08:00:12', serverTimestamp: `${date}T08:00:12-03:00`, type: 'E1', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') },
          { id: `p-${nsr}`, employeeId: emp.id, date, time: '12:02:45', serverTimestamp: `${date}T12:02:45-03:00`, type: 'S1', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') },
          { id: `p-${nsr}`, employeeId: emp.id, date, time: '13:01:10', serverTimestamp: `${date}T13:01:10-03:00`, type: 'E2', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') }
          // Falta saída S2!
        );
        return;
      }

      // Caso especial 2 (Mockup Stitch): Thiago Mansur em 24/10 tem "Falha Leitor Biométrico" (Entrada manual pendente)
      if (emp.id === 'emp-tm' && date === '2024-10-24') {
        // Chegou às 09:02 e precisa de aprovação de entrada
        return;
      }

      // Caso especial 3 (Mockup Stitch): Patrícia Lima em 22/10 tem consulta médica
      if (emp.id === 'emp-pl' && date === '2024-10-22') {
        punches.push(
          { id: `p-${nsr}`, employeeId: emp.id, date, time: '08:05:00', serverTimestamp: `${date}T08:05:00-03:00`, type: 'E1', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') },
          { id: `p-${nsr}`, employeeId: emp.id, date, time: '12:00:00', serverTimestamp: `${date}T12:00:00-03:00`, type: 'S1', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') },
          { id: `p-${nsr}`, employeeId: emp.id, date, time: '13:00:00', serverTimestamp: `${date}T13:00:00-03:00`, type: 'E2', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') },
          { id: `p-${nsr}`, employeeId: emp.id, date, time: '16:00:00', serverTimestamp: `${date}T16:00:00-03:00`, type: 'S2', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') }
        );
        return;
      }

      // Dia normal com pequenas variações pontuais
      const isFriday = new Date(`${date}T12:00:00Z`).getUTCDay() === 5;
      const exitTime = isFriday ? '17:03:14' : '18:04:20';

      punches.push(
        { id: `p-${nsr}`, employeeId: emp.id, date, time: '08:02:10', serverTimestamp: `${date}T08:02:10-03:00`, type: 'E1', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') },
        { id: `p-${nsr}`, employeeId: emp.id, date, time: '12:01:05', serverTimestamp: `${date}T12:01:05-03:00`, type: 'S1', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') },
        { id: `p-${nsr}`, employeeId: emp.id, date, time: '13:02:40', serverTimestamp: `${date}T13:02:40-03:00`, type: 'E2', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') },
        { id: `p-${nsr}`, employeeId: emp.id, date, time: exitTime, serverTimestamp: `${date}T${exitTime}-03:00`, type: 'S2', origin: 'quiosque', nsr: nsr++, ip: '192.168.1.15', userAgent: 'Tablet Quiosque PontoPro v1.2', isEdited: false, hash: crypto.randomBytes(16).toString('hex') }
      );
    });
  });

  return punches;
}

class Database {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Erro ao ler base de dados local, inicializando dados padrão:', err);
    }

    const initialPunches = generateInitialPunches();

    const initial: DatabaseState = {
      company: {
        name: 'Acme Inc.',
        tradeName: 'PontoPro Enterprise',
        cnpj: '12.345.678/0001-90',
        address: 'Av. Paulista, 1000 - Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        responsibleName: 'Ana Clara Albuquerque',
        responsibleRole: 'Diretora de Recursos Humanos',
        timezone: 'America/Sao_Paulo',
      },
      employees: DEFAULT_EMPLOYEES,
      schedules: DEFAULT_SCHEDULES,
      punches: initialPunches,
      absences: [
        {
          id: 'abs-01',
          employeeId: 'emp-pl',
          type: 'Consulta',
          startDate: '2024-10-22',
          endDate: '2024-10-22',
          abonaHoras: true,
          observation: 'Consulta Médica Oftalmológica (14:00 - 16:00)',
          attachmentName: 'comprovante_oftalmo_2210.pdf',
          status: 'pendente',
        },
        {
          id: 'abs-02',
          employeeId: 'emp-ra',
          type: 'Atestado',
          startDate: '2024-10-09',
          endDate: '2024-10-10',
          abonaHoras: true,
          observation: 'Atestado Médico CID J00 (Gripe forte)',
          attachmentName: 'atestado_rodrigo_0910.pdf',
          status: 'aprovado',
          approvedBy: 'RH Admin',
          approvedAt: '2024-10-11T10:00:00-03:00',
        },
      ],
      holidays: DEFAULT_HOLIDAYS,
      auditLogs: [
        {
          id: 'aud-01',
          employeeId: 'emp-tm',
          changedBy: 'RH Admin (Mariana)',
          timestamp: '2024-10-20T14:30:00-03:00',
          previousValue: '18:00',
          newValue: '18:45',
          reason: 'Ajuste solicitado pelo colaborador: continuação de reunião de fechamento com a diretoria.',
          actionType: 'UPDATE',
        },
      ],
      closings: [
        {
          id: 'close-2024-09',
          competence: '2024-09',
          closedAt: '2024-10-01T18:00:00-03:00',
          closedBy: 'Ana Clara Albuquerque (RH)',
          status: 'fechado',
          totals: {
            totalWorkedMinutes: 52800,
            totalOvertime50Minutes: 1420,
            totalOvertime100Minutes: 300,
            totalDeficitMinutes: 120,
            employeesValidated: 5,
            employeesTotal: 5,
          },
        },
        {
          id: 'close-2024-10',
          competence: '2024-10',
          status: 'aberto',
          totals: {
            totalWorkedMinutes: 48900,
            totalOvertime50Minutes: 14550, // ~242h 30m
            totalOvertime100Minutes: 600,
            totalDeficitMinutes: 450,
            employeesValidated: 112,
            employeesTotal: 148,
          },
        },
      ],
      nextNsr: 10500,
    };

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Não foi possível gravar arquivo inicial no disco:', e);
    }

    return initial;
  }

  public save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao salvar dados no disco:', err);
    }
  }

  public getCompany(): CompanySettings {
    return this.state.company;
  }

  public updateCompany(settings: Partial<CompanySettings>) {
    this.state.company = { ...this.state.company, ...settings };
    this.save();
    return this.state.company;
  }

  public getEmployees(onlyActive = false): Employee[] {
    if (onlyActive) {
      return this.state.employees.filter((e) => e.status === 'ativo');
    }
    return this.state.employees;
  }

  public getEmployeeById(id: string): Employee | undefined {
    return this.state.employees.find((e) => e.id === id);
  }

  public getEmployeeByCpf(cpf: string): Employee | undefined {
    const cleanCpf = cpf.replace(/\D/g, '');
    return this.state.employees.find((e) => e.cpf.replace(/\D/g, '') === cleanCpf);
  }

  public addEmployee(data: Omit<Employee, 'id' | 'avatarInitials'>): Employee {
    const initials = data.name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const newEmp: Employee = {
      ...data,
      id: `emp-${Date.now().toString(36)}`,
      avatarInitials: initials,
    };
    this.state.employees.push(newEmp);
    this.save();
    return newEmp;
  }

  public updateEmployee(id: string, updates: Partial<Employee>): Employee | null {
    const idx = this.state.employees.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    if (updates.name) {
      updates.avatarInitials = updates.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }

    this.state.employees[idx] = { ...this.state.employees[idx], ...updates };
    this.save();
    return this.state.employees[idx];
  }

  public getSchedules(): ShiftSchedule[] {
    return this.state.schedules;
  }

  public getScheduleById(id: string): ShiftSchedule | undefined {
    return this.state.schedules.find((s) => s.id === id) || this.state.schedules[0];
  }

  public addSchedule(schedule: Omit<ShiftSchedule, 'id'>): ShiftSchedule {
    const newSch: ShiftSchedule = {
      ...schedule,
      id: `sch-${Date.now().toString(36)}`,
    };
    this.state.schedules.push(newSch);
    this.save();
    return newSch;
  }

  public updateSchedule(id: string, updates: Partial<ShiftSchedule>): ShiftSchedule | null {
    const idx = this.state.schedules.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.state.schedules[idx] = { ...this.state.schedules[idx], ...updates };
    this.save();
    return this.state.schedules[idx];
  }

  public getPunches(employeeId?: string, month?: string): PunchRecord[] {
    let result = this.state.punches;
    if (employeeId) {
      result = result.filter((p) => p.employeeId === employeeId);
    }
    if (month) {
      result = result.filter((p) => p.date.startsWith(month));
    }
    return result.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  }

  public addPunch(punch: Omit<PunchRecord, 'id' | 'nsr' | 'hash'>): PunchRecord {
    const nsr = this.state.nextNsr++;
    const hashContent = `${nsr}|${punch.employeeId}|${punch.date}|${punch.time}|${punch.type}|${punch.serverTimestamp}`;
    const hash = crypto.createHash('sha256').update(hashContent).digest('hex');

    const newPunch: PunchRecord = {
      ...punch,
      id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      nsr,
      hash,
    };

    this.state.punches.push(newPunch);
    this.save();
    return newPunch;
  }

  public updatePunch(
    punchId: string,
    updates: { time: string; type?: PunchRecord['type']; editReason: string; editedBy: string }
  ): PunchRecord | null {
    const idx = this.state.punches.findIndex((p) => p.id === punchId);
    if (idx === -1) return null;

    const old = this.state.punches[idx];

    // Log de auditoria
    this.addAuditLog({
      punchId: old.id,
      employeeId: old.employeeId,
      changedBy: updates.editedBy,
      previousValue: `${old.type} às ${old.time}`,
      newValue: `${updates.type || old.type} às ${updates.time}`,
      reason: updates.editReason,
      actionType: 'UPDATE',
    });

    this.state.punches[idx] = {
      ...old,
      time: updates.time,
      type: updates.type || old.type,
      isEdited: true,
      originalTime: old.originalTime || old.time,
      originalType: old.originalType || old.type,
      editReason: updates.editReason,
      editedBy: updates.editedBy,
      editedAt: new Date().toISOString(),
    };

    this.save();
    return this.state.punches[idx];
  }

  public deletePunch(punchId: string, reason: string, deletedBy: string): boolean {
    const idx = this.state.punches.findIndex((p) => p.id === punchId);
    if (idx === -1) return false;

    const old = this.state.punches[idx];
    this.addAuditLog({
      punchId: old.id,
      employeeId: old.employeeId,
      changedBy: deletedBy,
      previousValue: `Batida ${old.type} em ${old.date} às ${old.time} (NSR: ${old.nsr})`,
      newValue: '[REGISTRO DESATIVADO]',
      reason,
      actionType: 'DELETE',
    });

    // Remove do array ativo (a auditoria preserva o registro para sempre conforme Portaria 671)
    this.state.punches.splice(idx, 1);
    this.save();
    return true;
  }

  public getAbsences(employeeId?: string): Absence[] {
    if (employeeId) {
      return this.state.absences.filter((a) => a.employeeId === employeeId);
    }
    return this.state.absences;
  }

  public addAbsence(data: Omit<Absence, 'id'>): Absence {
    const newAbsence: Absence = {
      ...data,
      id: `abs-${Date.now().toString(36)}`,
    };
    this.state.absences.push(newAbsence);
    this.save();
    return newAbsence;
  }

  public updateAbsenceStatus(id: string, status: 'aprovado' | 'rejeitado', approvedBy: string): Absence | null {
    const idx = this.state.absences.findIndex((a) => a.id === id);
    if (idx === -1) return null;

    this.state.absences[idx].status = status;
    this.state.absences[idx].approvedBy = approvedBy;
    this.state.absences[idx].approvedAt = new Date().toISOString();
    this.save();
    return this.state.absences[idx];
  }

  public getHolidays(): Holiday[] {
    return this.state.holidays;
  }

  public addHoliday(holiday: Omit<Holiday, 'id'>): Holiday {
    const newHol: Holiday = {
      ...holiday,
      id: `h-${Date.now().toString(36)}`,
    };
    this.state.holidays.push(newHol);
    this.save();
    return newHol;
  }

  public getAuditLogs(employeeId?: string): AuditLog[] {
    if (employeeId) {
      return this.state.auditLogs.filter((l) => l.employeeId === employeeId);
    }
    return [...this.state.auditLogs].reverse();
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs.push(newLog);
    this.save();
    return newLog;
  }

  public getClosings(): MonthlyClosing[] {
    return this.state.closings;
  }

  public getClosingByCompetence(competence: string): MonthlyClosing | undefined {
    return this.state.closings.find((c) => c.competence === competence);
  }

  public closeMonth(
    competence: string,
    closedBy: string,
    totals: MonthlyClosing['totals']
  ): MonthlyClosing {
    let closing = this.getClosingByCompetence(competence);
    if (!closing) {
      closing = {
        id: `close-${competence}`,
        competence,
        status: 'fechado',
        closedAt: new Date().toISOString(),
        closedBy,
        totals,
      };
      this.state.closings.push(closing);
    } else {
      closing.status = 'fechado';
      closing.closedAt = new Date().toISOString();
      closing.closedBy = closedBy;
      closing.totals = totals;
    }

    this.addAuditLog({
      employeeId: 'ALL',
      changedBy: closedBy,
      previousValue: 'Competência Aberta',
      newValue: `Competência ${competence} FECHADA. Saldo positivo de banco de horas convertido em HE.`,
      reason: 'Fechamento oficial mensal da folha de ponto',
      actionType: 'CLOSE_MONTH',
    });

    this.save();
    return closing;
  }

  public reopenMonth(competence: string, reopenedBy: string, reason: string): MonthlyClosing | null {
    const closing = this.getClosingByCompetence(competence);
    if (!closing) return null;

    closing.status = 'aberto';
    closing.reopenedBy = reopenedBy;
    closing.reopenedAt = new Date().toISOString();
    closing.reopenReason = reason;

    this.addAuditLog({
      employeeId: 'ALL',
      changedBy: reopenedBy,
      previousValue: `Competência ${competence} Fechada`,
      newValue: `Competência ${competence} REABERTA`,
      reason,
      actionType: 'REOPEN_MONTH',
    });

    this.save();
    return closing;
  }
}

export const db = new Database();
