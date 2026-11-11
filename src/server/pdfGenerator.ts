/**
 * Gerador de Folha de Ponto / Espelho de Ponto em PDF (A4 em PAISAGEM)
 * Em conformidade com a Portaria MTP 671/2021
 */

import PDFDocument from 'pdfkit';
import { CompanySettings, MonthCalculation } from '../types/index.ts';
import { formatMinutesToTime, DAY_OF_WEEK_SHORT } from '../services/timeCalculationEngine.ts';

export function generateTimesheetPDF(
  calc: MonthCalculation,
  company: CompanySettings
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // A4 Landscape: 841.89 x 595.28 pt
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 20,
      bufferPages: true,
      info: {
        Title: `Espelho_Ponto_${calc.employee.name.replace(/\s+/g, '_')}_${calc.competence}.pdf`,
        Author: 'PontoPro Enterprise',
        Subject: 'Folha de Ponto e Controle de Jornada Portaria MTP 671/2021',
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', (err) => reject(err));

    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const marginLeft = 20;
    const marginRight = pageWidth - 20;
    const contentWidth = marginRight - marginLeft;

    // Cabeçalho da Empresa e Dados do Colaborador
    doc.rect(marginLeft, 15, contentWidth, 58).strokeColor('#334155').lineWidth(0.75).stroke();

    // Linha divisória vertical
    doc.moveTo(pageWidth * 0.48, 15).lineTo(pageWidth * 0.48, 73).stroke();

    // Coluna 1: Dados da Empresa
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);
    doc.text(company.name.toUpperCase(), marginLeft + 10, 20);
    doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
    doc.text(`Nome Fantasia: ${company.tradeName}`, marginLeft + 10, 32);
    doc.text(`CNPJ: ${company.cnpj} • Endereço: ${company.address}, ${company.city}-${company.state}`, marginLeft + 10, 43);
    doc.text(`Portaria MTP 671/2021 • REP-P homologado • Fuso Horário Oficial: ${company.timezone}`, marginLeft + 10, 54);

    // Coluna 2: Dados do Colaborador e Competência
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a');
    doc.text(`COLABORADOR: ${calc.employee.name.toUpperCase()}`, pageWidth * 0.48 + 10, 20);
    doc.font('Helvetica').fontSize(7.5).fillColor('#334155');
    doc.text(`CPF: ${calc.employee.cpf}   |   Cargo: ${calc.employee.role}   |   Setor: ${calc.employee.department}`, pageWidth * 0.48 + 10, 32);
    doc.text(`Admissão: ${calc.employee.admissionDate}   |   Escala: ${calc.schedule.name}`, pageWidth * 0.48 + 10, 43);

    const [year, month] = calc.competence.split('-');
    const monthsNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const compFormatted = `${monthsNames[parseInt(month, 10) - 1]} / ${year}`;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e40af');
    doc.text(`COMPETÊNCIA: ${compFormatted.toUpperCase()}  (${calc.closed ? 'FECHADA' : 'EM ABERTO'})`, pageWidth * 0.48 + 10, 54);

    // Tabela Diária
    const tableTop = 78;
    const colWidths = {
      dia: 35,
      sem: 35,
      batidas: 320,
      trab: 50,
      he50: 50,
      he100: 50,
      atraso: 50,
      obs: contentWidth - (35 + 35 + 320 + 50 + 50 + 50 + 50), // restante (~211px)
    };

    // Header da Tabela
    doc.rect(marginLeft, tableTop, contentWidth, 14).fillColor('#1e293b').fill();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7);

    let curX = marginLeft;
    doc.text('DIA', curX + 6, tableTop + 3.5); curX += colWidths.dia;
    doc.text('SEM', curX + 4, tableTop + 3.5); curX += colWidths.sem;
    doc.text('REGISTROS DE PONTO (ORDEM CRONOLÓGICA DAS BATIDAS)', curX + 8, tableTop + 3.5); curX += colWidths.batidas;
    doc.text('TRAB.', curX + 10, tableTop + 3.5); curX += colWidths.trab;
    doc.text('HE 50%', curX + 10, tableTop + 3.5); curX += colWidths.he50;
    doc.text('HE 100%', curX + 8, tableTop + 3.5); curX += colWidths.he100;
    doc.text('FALTA/ATR.', curX + 5, tableTop + 3.5); curX += colWidths.atraso;
    doc.text('OCORRÊNCIAS / OBSERVAÇÕES / AUDITORIA', curX + 6, tableTop + 3.5);

    // Linhas da Tabela
    let rowY = tableTop + 14;
    const rowHeight = 11.2; // Cabe perfeitamente 31 dias em uma única folha A4

    calc.days.forEach((dayCalc, idx) => {
      const isEven = idx % 2 === 0;
      const isWeekend = dayCalc.dayOfWeek === 0 || dayCalc.dayOfWeek === 6;
      const isHoliday = dayCalc.isHoliday;

      // Fundo da linha
      let bg = isEven ? '#f8fafc' : '#ffffff';
      if (isHoliday) bg = '#fef3c7'; // âmbar suave
      else if (isWeekend) bg = '#f1f5f9';

      doc.rect(marginLeft, rowY, contentWidth, rowHeight).fillColor(bg).fill();
      doc.rect(marginLeft, rowY, contentWidth, rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

      // Formatação das batidas
      let punchesText = '';
      if (dayCalc.punches.length > 0) {
        punchesText = dayCalc.punches
          .map((p) => {
            const editMarker = p.isEdited ? '*' : '';
            return `${p.type}: ${p.time.slice(0, 5)}${editMarker}`;
          })
          .join('   ');
      } else if (isHoliday) {
        punchesText = `FERIADO: ${dayCalc.holidayName || ''}`;
      } else if (dayCalc.isOffDay) {
        punchesText = 'FOLGA / DSR';
      } else if (dayCalc.isCompensatedByAbsence) {
        punchesText = `AUSÊNCIA ABONADA: ${dayCalc.absenceType || ''}`;
      }

      // Ocorrência
      let occurrenceText = '';
      if (dayCalc.hasInconsistency) {
        occurrenceText = `[!] ${dayCalc.inconsistencyReason}`;
      } else if (dayCalc.isCompensatedByAbsence) {
        occurrenceText = `Abono de horas (${dayCalc.absenceType})`;
      } else if (dayCalc.punches.some((p) => p.isEdited)) {
        occurrenceText = '* Batida incluída/ajustada manualmente com justificativa';
      }

      doc.fillColor(dayCalc.hasInconsistency ? '#b91c1c' : '#0f172a').font('Helvetica').fontSize(6.8);

      curX = marginLeft;
      // Dia (01, 02...)
      doc.text(dayCalc.date.slice(8, 10), curX + 8, rowY + 2.5); curX += colWidths.dia;
      // Sem (Seg, Ter...)
      doc.text(DAY_OF_WEEK_SHORT[dayCalc.dayOfWeek], curX + 6, rowY + 2.5); curX += colWidths.sem;
      // Batidas
      doc.font('Courier').fontSize(6.5).text(punchesText, curX + 6, rowY + 2.5); curX += colWidths.batidas;
      doc.font('Helvetica').fontSize(6.8);
      // Horas Trabalhadas
      doc.text(dayCalc.workedMinutes > 0 ? formatMinutesToTime(dayCalc.workedMinutes) : '-', curX + 12, rowY + 2.5); curX += colWidths.trab;
      // HE 50%
      doc.text(dayCalc.overtime50Minutes > 0 ? formatMinutesToTime(dayCalc.overtime50Minutes) : '-', curX + 12, rowY + 2.5); curX += colWidths.he50;
      // HE 100%
      doc.text(dayCalc.overtime100Minutes > 0 ? formatMinutesToTime(dayCalc.overtime100Minutes) : '-', curX + 12, rowY + 2.5); curX += colWidths.he100;
      // Atraso
      doc.text(dayCalc.deficitMinutes > 0 ? formatMinutesToTime(dayCalc.deficitMinutes) : '-', curX + 12, rowY + 2.5); curX += colWidths.atraso;
      // Obs
      doc.fontSize(6).text(occurrenceText.slice(0, 55), curX + 4, rowY + 2.8);

      rowY += rowHeight;
    });

    // Linha de Totais da Folha
    doc.rect(marginLeft, rowY, contentWidth, 16).fillColor('#0f172a').fill();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5);

    curX = marginLeft;
    doc.text('TOTAIS CONSOLIDADOS DO MÊS', curX + 15, rowY + 4);
    curX += colWidths.dia + colWidths.sem + colWidths.batidas;

    doc.text(formatMinutesToTime(calc.totalWorkedMinutes), curX + 10, rowY + 4); curX += colWidths.trab;
    doc.text(formatMinutesToTime(calc.totalOvertime50Minutes), curX + 10, rowY + 4); curX += colWidths.he50;
    doc.text(formatMinutesToTime(calc.totalOvertime100Minutes), curX + 10, rowY + 4); curX += colWidths.he100;
    doc.text(formatMinutesToTime(calc.totalDeficitMinutes), curX + 10, rowY + 4); curX += colWidths.atraso;

    const saldoSinal = calc.netBalanceMinutes >= 0 ? '+' : '';
    doc.text(`SALDO LIQ: ${saldoSinal}${formatMinutesToTime(calc.netBalanceMinutes)}`, curX + 10, rowY + 4);

    rowY += 20;

    // Resumo Legal e Legenda
    doc.rect(marginLeft, rowY, contentWidth, 24).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
    doc.fillColor('#475569').font('Helvetica').fontSize(6);
    doc.text(
      'LEGENDA: * = Registro incluído ou alterado manualmente com justificativa legal em auditoria. Tolerância CLT Art. 58 § 1º (5 min por batida, max 10 min/dia) aplicada integralmente.',
      marginLeft + 6,
      rowY + 4
    );
    doc.text(
      'BANCO DE HORAS MENSAL: Compensado no mês civil. No fechamento da folha, saldo credor é convertido em Horas Extras para pagamento e o banco é zerado para o período seguinte.',
      marginLeft + 6,
      rowY + 13
    );

    rowY += 30;

    // Assinaturas
    const sigWidth = (contentWidth - 60) / 2;

    // Assinatura Colaborador
    doc.moveTo(marginLeft + 20, rowY + 30).lineTo(marginLeft + 20 + sigWidth, rowY + 30).strokeColor('#64748b').stroke();
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(7.5);
    doc.text(calc.employee.name.toUpperCase(), marginLeft + 20, rowY + 34, { width: sigWidth, align: 'center' });
    doc.font('Helvetica').fontSize(6.5).fillColor('#64748b');
    doc.text(`Assinatura do Empregado • Data: _____/_____/_________`, marginLeft + 20, rowY + 44, { width: sigWidth, align: 'center' });

    // Assinatura Empresa
    const sig2X = marginLeft + 40 + sigWidth;
    doc.moveTo(sig2X, rowY + 30).lineTo(sig2X + sigWidth, rowY + 30).strokeColor('#64748b').stroke();
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(7.5);
    doc.text(`${company.name.toUpperCase()} (RESPONSÁVEL RH)`, sig2X, rowY + 34, { width: sigWidth, align: 'center' });
    doc.font('Helvetica').fontSize(6.5).fillColor('#64748b');
    doc.text(`${company.responsibleName} — ${company.responsibleRole}`, sig2X, rowY + 44, { width: sigWidth, align: 'center' });

    doc.end();
  });
}
