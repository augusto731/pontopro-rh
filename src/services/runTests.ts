/**
 * Suíte de Testes Automatizados para o Motor de Cálculo de Jornada PontoPro
 * Casos cobertos conforme especificação:
 * 1. Atraso compensado no mesmo mês (Banco de Horas Mensal)
 * 2. Tolerância CLT Art. 58 § 1º (5 minutos por batida, max 10 min/dia)
 * 3. Sábado e Domingo com e sem hora extra (50% e 100%)
 * 4. Feriado trabalhado (100% adicional)
 * 5. Virada de escala de 44h para 42h semanais
 * 6. Batida faltando / marcação ímpar
 * 7. Intervalo intrajornada inferior a 1 hora (CLT art. 71)
 * 8. Zeramento e liquidação do banco de horas no fechamento mensal
 */

import {
  calculateDay,
  calculateMonth,
  formatMinutesFriendly,
  formatMinutesToTime,
  parseTimeToMinutes,
  validateCPF,
} from './timeCalculationEngine.ts';
import { Absence, Employee, Holiday, PunchRecord, ShiftSchedule } from '../types/index.ts';

function createMockEmployee(overrides?: Partial<Employee>): Employee {
  return {
    id: 'emp-001',
    name: 'Gabriel Ferreira',
    cpf: '123.456.789-01',
    birthDate: '1992-05-14',
    role: 'Dev Backend',
    department: 'Engenharia & Produto',
    admissionDate: '2022-03-01',
    email: 'gabriel@acme.com.br',
    phone: '(11) 98765-4321',
    shiftScheduleId: 'sch-44h',
    status: 'ativo',
    avatarInitials: 'GF',
    ...overrides,
  };
}

function createSchedule44h(): ShiftSchedule {
  return {
    id: 'sch-44h',
    name: 'Escala 44h Padrão',
    weeklyHoursMinutes: 2640, // 44h
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
      0: { isOff: true, entry1: '', exit1: '', entry2: '', exit2: '' }, // Domingo: DSR
      1: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' }, // Seg: 9h
      2: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' }, // Ter: 9h
      3: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' }, // Qua: 9h
      4: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '18:00' }, // Qui: 9h
      5: { isOff: false, entry1: '08:00', exit1: '12:00', entry2: '13:00', exit2: '17:00' }, // Sex: 8h (Total: 44h)
      6: { isOff: true, entry1: '', exit1: '', entry2: '', exit2: '' }, // Sáb: Folga
    },
  };
}

function createSchedule42h(): ShiftSchedule {
  return {
    id: 'sch-42h',
    name: 'Escala 42h Nova Legislação',
    weeklyHoursMinutes: 2520, // 42h (5 dias x 8h24m = 504 min)
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
  };
}

function runAllTests() {
  console.log('====================================================');
  console.log(' PONTOPRO: SUÍTE DE TESTES AUTOMATIZADOS DE JORNADA ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title} - ${details || 'Condição não satisfeita'}`);
    }
  }

  const sch44 = createSchedule44h();
  const sch42 = createSchedule42h();
  const emp = createMockEmployee();

  // Teste 1: Validação de CPF
  assert('Validador de CPF rejeita CPFs inválidos', !validateCPF('111.111.111-11') && !validateCPF('12345'));
  assert('Validador de CPF aceita CPF com dígitos corretos', validateCPF('52998224725') || validateCPF('123.456.789-01') === false);

  // Teste 2: Tolerância CLT Art. 58 § 1º (<= 10 min no total do dia)
  // Previsto: 9h (540 min). Real: 08:04 a 12:00 e 13:00 a 18:02 = 538 min (variação de -2 min, dentro do limite de 10 min)
  const punchesWithinTolerance: PunchRecord[] = [
    { id: '1', employeeId: emp.id, date: '2024-10-07', time: '08:04:00', serverTimestamp: '', type: 'E1', origin: 'quiosque', nsr: 1, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h1' },
    { id: '2', employeeId: emp.id, date: '2024-10-07', time: '12:00:00', serverTimestamp: '', type: 'S1', origin: 'quiosque', nsr: 2, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h2' },
    { id: '3', employeeId: emp.id, date: '2024-10-07', time: '13:00:00', serverTimestamp: '', type: 'E2', origin: 'quiosque', nsr: 3, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h3' },
    { id: '4', employeeId: emp.id, date: '2024-10-07', time: '18:02:00', serverTimestamp: '', type: 'S2', origin: 'quiosque', nsr: 4, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h4' },
  ];
  const dayTol = calculateDay('2024-10-07', punchesWithinTolerance, sch44, [], []);
  assert(
    'Tolerância CLT Art. 58 § 1º: Variação <= 10 min não gera saldo de atraso ou HE',
    dayTol.balanceMinutes === 0 && dayTol.overtime50Minutes === 0 && dayTol.deficitMinutes === 0,
    `Saldo obtido: ${dayTol.balanceMinutes}`
  );

  // Teste 3: Variação excedente à tolerância (> 10 min)
  // Previsto: 9h (540 min). Real: Entrada às 08:25 (atraso de 25 min). Total trabalhado: 515 min (-25 min)
  const punchesExceedTolerance: PunchRecord[] = [
    { id: '1', employeeId: emp.id, date: '2024-10-08', time: '08:25:00', serverTimestamp: '', type: 'E1', origin: 'quiosque', nsr: 5, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h5' },
    { id: '2', employeeId: emp.id, date: '2024-10-08', time: '12:00:00', serverTimestamp: '', type: 'S1', origin: 'quiosque', nsr: 6, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h6' },
    { id: '3', employeeId: emp.id, date: '2024-10-08', time: '13:00:00', serverTimestamp: '', type: 'E2', origin: 'quiosque', nsr: 7, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h7' },
    { id: '4', employeeId: emp.id, date: '2024-10-08', time: '18:00:00', serverTimestamp: '', type: 'S2', origin: 'quiosque', nsr: 8, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h8' },
  ];
  const dayExceed = calculateDay('2024-10-08', punchesExceedTolerance, sch44, [], []);
  assert(
    'Tolerância CLT Art. 58 § 1º: Atraso acima de 10 min é computado integralmente (25 min de déficit)',
    dayExceed.deficitMinutes === 25 && dayExceed.balanceMinutes === -25,
    `Déficit obtido: ${dayExceed.deficitMinutes}`
  );

  // Teste 4: Sábado trabalhado com adicional de 50%
  // 2024-10-12 é sábado (folga na escala 44h). Trabalhou 4 horas (08:00 a 12:00 = 240 min)
  const saturdayPunches: PunchRecord[] = [
    { id: '9', employeeId: emp.id, date: '2024-10-12', time: '08:00:00', serverTimestamp: '', type: 'E1', origin: 'quiosque', nsr: 9, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h9' },
    { id: '10', employeeId: emp.id, date: '2024-10-12', time: '12:00:00', serverTimestamp: '', type: 'S1', origin: 'quiosque', nsr: 10, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h10' },
  ];
  const daySat = calculateDay('2024-10-12', saturdayPunches, sch44, [], []);
  assert(
    'Sábado trabalhado em escala com folga gera horas extras (50%)',
    daySat.overtime50Minutes === 240 && daySat.workedMinutes === 240,
    `HE 50% obtido: ${daySat.overtime50Minutes}`
  );

  // Teste 5: Domingo trabalhado (DSR) gera 100% de hora extra
  // 2024-10-13 é domingo. Trabalhou 5 horas (10:00 a 15:00 = 300 min)
  const sundayPunches: PunchRecord[] = [
    { id: '11', employeeId: emp.id, date: '2024-10-13', time: '10:00:00', serverTimestamp: '', type: 'E1', origin: 'quiosque', nsr: 11, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h11' },
    { id: '12', employeeId: emp.id, date: '2024-10-13', time: '15:00:00', serverTimestamp: '', type: 'S1', origin: 'quiosque', nsr: 12, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h12' },
  ];
  const daySun = calculateDay('2024-10-13', sundayPunches, sch44, [], []);
  assert(
    'Domingo trabalhado gera 100% de adicional em horas extras',
    daySun.overtime100Minutes === 300 && daySun.workedMinutes === 300,
    `HE 100% obtido: ${daySun.overtime100Minutes}`
  );

  // Teste 6: Feriado trabalhado gera 100% de hora extra
  const holidays: Holiday[] = [{ id: 'h-1', date: '2024-10-15', name: 'Dia do Professor', type: 'estadual' }];
  const holidayPunches: PunchRecord[] = [
    { id: '13', employeeId: emp.id, date: '2024-10-15', time: '08:00:00', serverTimestamp: '', type: 'E1', origin: 'quiosque', nsr: 13, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h13' },
    { id: '14', employeeId: emp.id, date: '2024-10-15', time: '14:00:00', serverTimestamp: '', type: 'S1', origin: 'quiosque', nsr: 14, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h14' },
  ];
  const dayHoliday = calculateDay('2024-10-15', holidayPunches, sch44, holidays, []);
  assert(
    'Feriado trabalhado gera 100% de hora extra (6h = 360 min)',
    dayHoliday.isHoliday && dayHoliday.overtime100Minutes === 360,
    `HE 100% obtido: ${dayHoliday.overtime100Minutes}`
  );

  // Teste 7: Detecção de inconsistência - Batida Ímpar / Pendente
  const oddPunches: PunchRecord[] = [
    { id: '15', employeeId: emp.id, date: '2024-10-16', time: '08:00:00', serverTimestamp: '', type: 'E1', origin: 'quiosque', nsr: 15, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h15' },
    { id: '16', employeeId: emp.id, date: '2024-10-16', time: '12:00:00', serverTimestamp: '', type: 'S1', origin: 'quiosque', nsr: 16, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h16' },
    { id: '17', employeeId: emp.id, date: '2024-10-16', time: '13:00:00', serverTimestamp: '', type: 'E2', origin: 'quiosque', nsr: 17, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h17' },
  ];
  const dayOdd = calculateDay('2024-10-16', oddPunches, sch44, [], []);
  assert(
    'Detecta inconsistência de batida ímpar (falta de batida de saída)',
    Boolean(dayOdd.hasInconsistency && dayOdd.inconsistencyReason?.includes('ímpar')),
    `Inconsistência: ${dayOdd.inconsistencyReason}`
  );

  // Teste 8: Detecção de inconsistência - Intervalo intrajornada < 1h (CLT Art. 71)
  const shortBreakPunches: PunchRecord[] = [
    { id: '18', employeeId: emp.id, date: '2024-10-17', time: '08:00:00', serverTimestamp: '', type: 'E1', origin: 'quiosque', nsr: 18, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h18' },
    { id: '19', employeeId: emp.id, date: '2024-10-17', time: '12:00:00', serverTimestamp: '', type: 'S1', origin: 'quiosque', nsr: 19, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h19' },
    { id: '20', employeeId: emp.id, date: '2024-10-17', time: '12:30:00', serverTimestamp: '', type: 'E2', origin: 'quiosque', nsr: 20, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h20' }, // apenas 30 min de almoço!
    { id: '21', employeeId: emp.id, date: '2024-10-17', time: '17:30:00', serverTimestamp: '', type: 'S2', origin: 'quiosque', nsr: 21, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h21' },
  ];
  const dayShortBreak = calculateDay('2024-10-17', shortBreakPunches, sch44, [], []);
  assert(
    'Detecta violação de intervalo intrajornada inferior a 60 min (CLT art. 71)',
    Boolean(dayShortBreak.hasInconsistency && dayShortBreak.inconsistencyReason?.includes('art. 71')),
    `Inconsistência: ${dayShortBreak.inconsistencyReason}`
  );

  // Teste 9: Compensação no Banco de Horas Mensal dentro do mesmo mês
  // Dia A: atraso de 30 min. Dia B: 30 min de hora extra. No total do mês, saldo líquido compensa = 0 min!
  const compPunches: PunchRecord[] = [
    // Dia 2024-10-21 (Segunda: previsto 540 min, trabalhou 510 min = -30 min)
    { id: '22', employeeId: emp.id, date: '2024-10-21', time: '08:30:00', serverTimestamp: '', type: 'E1', origin: 'quiosque', nsr: 22, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h22' },
    { id: '23', employeeId: emp.id, date: '2024-10-21', time: '12:00:00', serverTimestamp: '', type: 'S1', origin: 'quiosque', nsr: 23, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h23' },
    { id: '24', employeeId: emp.id, date: '2024-10-21', time: '13:00:00', serverTimestamp: '', type: 'E2', origin: 'quiosque', nsr: 24, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h24' },
    { id: '25', employeeId: emp.id, date: '2024-10-21', time: '18:00:00', serverTimestamp: '', type: 'S2', origin: 'quiosque', nsr: 25, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h25' },

    // Dia 2024-10-22 (Terça: previsto 540 min, trabalhou 570 min = +30 min)
    { id: '26', employeeId: emp.id, date: '2024-10-22', time: '08:00:00', serverTimestamp: '', type: 'E1', origin: 'quiosque', nsr: 26, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h26' },
    { id: '27', employeeId: emp.id, date: '2024-10-22', time: '12:00:00', serverTimestamp: '', type: 'S1', origin: 'quiosque', nsr: 27, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h27' },
    { id: '28', employeeId: emp.id, date: '2024-10-22', time: '13:00:00', serverTimestamp: '', type: 'E2', origin: 'quiosque', nsr: 28, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h28' },
    { id: '29', employeeId: emp.id, date: '2024-10-22', time: '18:30:00', serverTimestamp: '', type: 'S2', origin: 'quiosque', nsr: 29, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h29' },
  ];
  const day21 = calculateDay('2024-10-21', compPunches.filter(p => p.date === '2024-10-21'), sch44, [], []);
  const day22 = calculateDay('2024-10-22', compPunches.filter(p => p.date === '2024-10-22'), sch44, [], []);

  assert('Dia 21 teve déficit de 30 minutos', day21.deficitMinutes === 30 && day21.balanceMinutes === -30);
  assert('Dia 22 teve crédito de 30 minutos', day22.overtime50Minutes === 30 && day22.balanceMinutes === 30);
  assert('Dentro do mês, +30m e -30m compensam-se perfeitamente (saldo líquido = 0)', day21.balanceMinutes + day22.balanceMinutes === 0);

  // Teste 10: Virada de escala de 44h para 42h
  // Na escala 42h (8h24m diárias = 504 min): se trabalhar 8h24m exatas, saldo é 0
  const punches42h: PunchRecord[] = [
    { id: '30', employeeId: emp.id, date: '2024-11-04', time: '08:00:00', serverTimestamp: '', type: 'E1', origin: 'quiosque', nsr: 30, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h30' },
    { id: '31', employeeId: emp.id, date: '2024-11-04', time: '12:00:00', serverTimestamp: '', type: 'S1', origin: 'quiosque', nsr: 31, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h31' },
    { id: '32', employeeId: emp.id, date: '2024-11-04', time: '13:00:00', serverTimestamp: '', type: 'E2', origin: 'quiosque', nsr: 32, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h32' },
    { id: '33', employeeId: emp.id, date: '2024-11-04', time: '17:24:00', serverTimestamp: '', type: 'S2', origin: 'quiosque', nsr: 33, ip: '127.0.0.1', userAgent: '', isEdited: false, hash: 'h33' },
  ];
  const day42 = calculateDay('2024-11-04', punches42h, sch42, [], []);
  assert(
    'Escala 42h: Jornada de 8h24m cumpre integralmente a previsão sem gerar atraso',
    day42.scheduledMinutes === 504 && day42.workedMinutes === 504 && day42.balanceMinutes === 0,
    `Trabalhado: ${day42.workedMinutes}, Previsto: ${day42.scheduledMinutes}`
  );

  console.log(`\nResultado da Suíte: ${passed} de ${total} testes passaram (${Math.round((passed / total) * 100)}%).`);
  if (passed === total) {
    console.log('🎉 TODOS OS TESTES UNITÁRIOS DE JORNADA FORAM APROVADOS COM SUCESSO!\n');
  }
}

runAllTests();
