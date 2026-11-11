/**
 * Gerador de Relatórios em Excel (.xlsx) para Fechamento de Folha de Ponto
 */

import * as XLSX from 'xlsx';
import { MonthCalculation } from '../types/index.ts';
import { formatMinutesToTime } from '../services/timeCalculationEngine.ts';

export function generateClosingExcel(
  competence: string,
  calculations: MonthCalculation[]
): Buffer {
  const wb = XLSX.utils.book_new();

  // 1. Planilha Resumo Sintético do Fechamento
  const summaryRows = calculations.map((c) => ({
    'Nome do Colaborador': c.employee.name,
    'CPF': c.employee.cpf,
    'Setor / Departamento': c.employee.department,
    'Cargo': c.employee.role,
    'Escala de Trabalho': c.schedule.name,
    'Horas Previstas': formatMinutesToTime(c.totalScheduledMinutes),
    'Horas Trabalhadas': formatMinutesToTime(c.totalWorkedMinutes),
    'Horas Extras (50%)': formatMinutesToTime(c.totalOvertime50Minutes),
    'Horas Extras (100%)': formatMinutesToTime(c.totalOvertime100Minutes),
    'Atrasos e Faltas': formatMinutesToTime(c.totalDeficitMinutes),
    'Saldo Líquido Banco': (c.netBalanceMinutes >= 0 ? '+' : '') + formatMinutesToTime(c.netBalanceMinutes),
    'Status': c.closed ? 'Homologado / Fechado' : 'Em Aberto',
  }));

  // Linha de TOTAL Geral
  const sumScheduled = calculations.reduce((acc, c) => acc + c.totalScheduledMinutes, 0);
  const sumWorked = calculations.reduce((acc, c) => acc + c.totalWorkedMinutes, 0);
  const sumHE50 = calculations.reduce((acc, c) => acc + c.totalOvertime50Minutes, 0);
  const sumHE100 = calculations.reduce((acc, c) => acc + c.totalOvertime100Minutes, 0);
  const sumDeficit = calculations.reduce((acc, c) => acc + c.totalDeficitMinutes, 0);
  const sumNet = calculations.reduce((acc, c) => acc + c.netBalanceMinutes, 0);

  summaryRows.push({
    'Nome do Colaborador': '>>> TOTAL GERAL DA EMPRESA <<<',
    'CPF': '',
    'Setor / Departamento': `Total Colaboradores: ${calculations.length}`,
    'Cargo': '',
    'Escala de Trabalho': '',
    'Horas Previstas': formatMinutesToTime(sumScheduled),
    'Horas Trabalhadas': formatMinutesToTime(sumWorked),
    'Horas Extras (50%)': formatMinutesToTime(sumHE50),
    'Horas Extras (100%)': formatMinutesToTime(sumHE100),
    'Atrasos e Faltas': formatMinutesToTime(sumDeficit),
    'Saldo Líquido Banco': (sumNet >= 0 ? '+' : '') + formatMinutesToTime(sumNet),
    'Status': '',
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

  // Largura das colunas
  wsSummary['!cols'] = [
    { wch: 28 }, // Nome
    { wch: 16 }, // CPF
    { wch: 24 }, // Setor
    { wch: 22 }, // Cargo
    { wch: 24 }, // Escala
    { wch: 15 }, // Previsto
    { wch: 16 }, // Trabalhado
    { wch: 18 }, // HE 50%
    { wch: 18 }, // HE 100%
    { wch: 16 }, // Atrasos
    { wch: 20 }, // Saldo
    { wch: 20 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, `Fechamento ${competence}`);

  // 2. Planilha Analítica com Todas as Batidas Diárias
  const detailedRows: any[] = [];
  calculations.forEach((c) => {
    c.days.forEach((d) => {
      detailedRows.push({
        'Colaborador': c.employee.name,
        'CPF': c.employee.cpf,
        'Setor': c.employee.department,
        'Data': d.date,
        'Dia Semana': d.dayOfWeekLabel,
        'Horário Previsto': d.scheduledMinutes > 0 ? formatMinutesToTime(d.scheduledMinutes) : 'Folga/DSR',
        'Batidas Efetuadas': d.punches.map((p) => `${p.type}:${p.time.slice(0, 5)}${p.isEdited ? '*' : ''}`).join(' | '),
        'Minutos Trabalhados': d.workedMinutes,
        'Horas Trabalhadas': formatMinutesToTime(d.workedMinutes),
        'HE 50%': formatMinutesToTime(d.overtime50Minutes),
        'HE 100%': formatMinutesToTime(d.overtime100Minutes),
        'Atraso': formatMinutesToTime(d.deficitMinutes),
        'Inconsistência': d.hasInconsistency ? d.inconsistencyReason : 'Normal',
        'Feriado / Ausência': d.isHoliday ? d.holidayName : d.isCompensatedByAbsence ? d.absenceType : '',
      });
    });
  });

  const wsDetail = XLSX.utils.json_to_sheet(detailedRows);
  wsDetail['!cols'] = [
    { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
    { wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 35 }, { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Analítico Diário');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf as Buffer;
}
