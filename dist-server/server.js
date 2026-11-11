import express from "express";
import path from "path";
import JSZip from "jszip";
import { db } from "./src/server/db.ts";
import { calculateMonth, formatMinutesFriendly, maskPartialCPF, validateCPF } from "./src/services/timeCalculationEngine.ts";
import { generateTimesheetPDF } from "./src/server/pdfGenerator.ts";
import { generateClosingExcel } from "./src/server/excelGenerator.ts";
import { PUNCH_TYPE_LABELS } from "./src/types/index.ts";
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
function getServerSaoPauloTime() {
  const now = /* @__PURE__ */ new Date();
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const partMap = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });
  const date = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const time = `${partMap.hour}:${partMap.minute}:${partMap.second}`;
  const iso = `${date}T${time}-03:00`;
  return { date, time, iso, full: now };
}
app.get("/api/time", (req, res) => {
  const sTime = getServerSaoPauloTime();
  res.json({
    serverTime: sTime.time,
    serverDate: sTime.date,
    serverIso: sTime.iso,
    timezone: "America/Sao_Paulo"
  });
});
app.get("/api/company", (req, res) => {
  res.json(db.getCompany());
});
app.put("/api/company", (req, res) => {
  const updated = db.updateCompany(req.body);
  res.json(updated);
});
app.get("/api/employees", (req, res) => {
  const onlyActive = req.query.onlyActive === "true";
  const list = db.getEmployees(onlyActive);
  res.json(list);
});
app.post("/api/employees", (req, res) => {
  const { name, cpf, birthDate, role, department, admissionDate, email, phone, shiftScheduleId, pinCode } = req.body;
  if (!name || !cpf || !role || !department) {
    return res.status(400).json({ error: "Campos obrigat\xF3rios ausentes (nome, cpf, cargo, setor)." });
  }
  if (!validateCPF(cpf)) {
    return res.status(400).json({ error: "CPF inv\xE1lido." });
  }
  const existing = db.getEmployeeByCpf(cpf);
  if (existing) {
    return res.status(400).json({ error: "J\xE1 existe um colaborador cadastrado com este CPF." });
  }
  const newEmp = db.addEmployee({
    name,
    cpf,
    birthDate: birthDate || "1990-01-01",
    role,
    department,
    admissionDate: admissionDate || getServerSaoPauloTime().date,
    email: email || "",
    phone: phone || "",
    shiftScheduleId: shiftScheduleId || "sch-44h",
    status: "ativo",
    pinCode: pinCode || ""
  });
  db.addAuditLog({
    employeeId: newEmp.id,
    changedBy: req.body.operator || "RH Admin",
    previousValue: "[NOVO CADASTRO]",
    newValue: `Colaborador ${newEmp.name} (CPF ${newEmp.cpf}) cadastrado.`,
    reason: "Admiss\xE3o de colaborador",
    actionType: "CREATE"
  });
  res.status(201).json(newEmp);
});
app.put("/api/employees/:id", (req, res) => {
  const updated = db.updateEmployee(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Colaborador n\xE3o encontrado." });
  }
  db.addAuditLog({
    employeeId: updated.id,
    changedBy: req.body.operator || "RH Admin",
    previousValue: "Dados anteriores",
    newValue: `Colaborador atualizado. Status: ${updated.status}`,
    reason: req.body.reason || "Atualiza\xE7\xE3o cadastral",
    actionType: "UPDATE"
  });
  res.json(updated);
});
app.get("/api/schedules", (req, res) => {
  res.json(db.getSchedules());
});
app.post("/api/schedules", (req, res) => {
  const schedule = db.addSchedule(req.body);
  res.status(201).json(schedule);
});
app.put("/api/schedules/:id", (req, res) => {
  const updated = db.updateSchedule(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Escala n\xE3o encontrada." });
  res.json(updated);
});
app.post("/api/quiosque/punch", (req, res) => {
  const { cpf, pinCode, photoDataUrl } = req.body;
  if (!cpf) {
    return res.status(400).json({ error: "Informe o CPF do colaborador." });
  }
  const employee = db.getEmployeeByCpf(cpf);
  if (!employee) {
    return res.status(404).json({ error: "Colaborador n\xE3o encontrado com este CPF." });
  }
  if (employee.status !== "ativo") {
    return res.status(403).json({ error: "Colaborador inativo na empresa. Contate o RH." });
  }
  if (employee.pinCode && pinCode && employee.pinCode !== pinCode) {
    return res.status(401).json({ error: "PIN de seguran\xE7a incorreto." });
  }
  const sTime = getServerSaoPauloTime();
  const dateStr = sTime.date;
  const timeStr = sTime.time;
  const todayPunches = db.getPunches(employee.id).filter((p) => p.date === dateStr);
  if (todayPunches.length > 0) {
    const lastPunch = todayPunches[todayPunches.length - 1];
    const lastTimeSec = new Date(lastPunch.serverTimestamp).getTime();
    const currTimeSec = sTime.full.getTime();
    const diffSeconds = Math.abs(currTimeSec - lastTimeSec) / 1e3;
    if (diffSeconds < 60) {
      return res.status(429).json({
        error: `Aguarde pelo menos 1 minuto entre registros consecutivos. \xDAltima batida \xE0s ${lastPunch.time.slice(0, 5)}.`
      });
    }
  }
  const count = todayPunches.length;
  const sequenceTypes = ["E1", "S1", "E2", "S2", "E3", "S3"];
  const punchType = sequenceTypes[count] || "E3";
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = req.headers["user-agent"] || "Tablet Quiosque";
  const punch = db.addPunch({
    employeeId: employee.id,
    date: dateStr,
    time: timeStr,
    serverTimestamp: sTime.iso,
    type: punchType,
    origin: "quiosque",
    ip,
    userAgent,
    isEdited: false,
    photoDataUrl: photoDataUrl || void 0
  });
  const receipt = {
    nsr: punch.nsr,
    employeeId: employee.id,
    employeeName: employee.name,
    maskedCpf: maskPartialCPF(employee.cpf),
    role: employee.role,
    department: employee.department,
    date: punch.date,
    time: punch.time,
    type: punch.type,
    typeLabel: PUNCH_TYPE_LABELS[punch.type] || punch.type,
    serverTimestamp: punch.serverTimestamp,
    hash: punch.hash,
    companyName: db.getCompany().name,
    companyCnpj: db.getCompany().cnpj
  };
  res.status(201).json({
    message: "Ponto registrado com sucesso!",
    receipt
  });
});
app.post("/api/punches/manual", (req, res) => {
  const { employeeId, date, time, type, justification, operatorName } = req.body;
  if (!employeeId || !date || !time || !type || !justification) {
    return res.status(400).json({ error: "Todos os campos s\xE3o obrigat\xF3rios, incluindo justificativa legal." });
  }
  const employee = db.getEmployeeById(employeeId);
  if (!employee) return res.status(404).json({ error: "Colaborador n\xE3o encontrado." });
  const sTime = getServerSaoPauloTime();
  const punch = db.addPunch({
    employeeId,
    date,
    time: time.length === 5 ? `${time}:00` : time,
    serverTimestamp: `${date}T${time}:00-03:00`,
    type,
    origin: "manual",
    ip: req.socket.remoteAddress || "127.0.0.1",
    userAgent: req.headers["user-agent"] || "Painel RH",
    isEdited: true,
    editReason: justification,
    editedBy: operatorName || "RH Admin",
    editedAt: sTime.iso
  });
  db.addAuditLog({
    punchId: punch.id,
    employeeId,
    changedBy: operatorName || "RH Admin",
    previousValue: "[SEM REGISTRO]",
    newValue: `Batida manual ${punch.type} \xE0s ${punch.time} em ${punch.date}`,
    reason: justification,
    actionType: "CREATE"
  });
  res.status(201).json(punch);
});
app.put("/api/punches/:id", (req, res) => {
  const { time, type, justification, operatorName } = req.body;
  if (!time || !justification) {
    return res.status(400).json({ error: "Hor\xE1rio e justificativa legal s\xE3o obrigat\xF3rios." });
  }
  const updated = db.updatePunch(req.params.id, {
    time: time.length === 5 ? `${time}:00` : time,
    type,
    editReason: justification,
    editedBy: operatorName || "RH Admin"
  });
  if (!updated) return res.status(404).json({ error: "Registro de ponto n\xE3o encontrado." });
  res.json(updated);
});
app.delete("/api/punches/:id", (req, res) => {
  const { justification, operatorName } = req.body;
  if (!justification) {
    return res.status(400).json({ error: "Justificativa obrigat\xF3ria para desativa\xE7\xE3o de registro de ponto." });
  }
  const success = db.deletePunch(req.params.id, justification, operatorName || "RH Admin");
  if (!success) return res.status(404).json({ error: "Registro de ponto n\xE3o encontrado." });
  res.json({ message: "Registro de ponto desativado com trilha de auditoria preservada." });
});
app.get("/api/absences", (req, res) => {
  const employeeId = req.query.employeeId;
  res.json(db.getAbsences(employeeId));
});
app.post("/api/absences", (req, res) => {
  const { employeeId, type, startDate, endDate, abonaHoras, observation, attachmentName, operatorName } = req.body;
  if (!employeeId || !type || !startDate || !endDate) {
    return res.status(400).json({ error: "Campos obrigat\xF3rios ausentes." });
  }
  const newAbs = db.addAbsence({
    employeeId,
    type,
    startDate,
    endDate,
    abonaHoras: abonaHoras ?? true,
    observation: observation || "",
    attachmentName: attachmentName || void 0,
    status: "aprovado",
    approvedBy: operatorName || "RH Admin",
    approvedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  db.addAuditLog({
    employeeId,
    changedBy: operatorName || "RH Admin",
    previousValue: "[SEM AFASTAMENTO]",
    newValue: `Aus\xEAncia ${type} de ${startDate} at\xE9 ${endDate} (Abona: ${newAbs.abonaHoras ? "Sim" : "N\xE3o"})`,
    reason: observation || "Lan\xE7amento de aus\xEAncia justificada",
    actionType: "CREATE"
  });
  res.status(201).json(newAbs);
});
app.put("/api/absences/:id/status", (req, res) => {
  const { status, operatorName } = req.body;
  const updated = db.updateAbsenceStatus(req.params.id, status, operatorName || "RH Admin");
  if (!updated) return res.status(404).json({ error: "Aus\xEAncia n\xE3o encontrada." });
  res.json(updated);
});
app.get("/api/holidays", (req, res) => {
  res.json(db.getHolidays());
});
app.post("/api/holidays", (req, res) => {
  const { date, name, type } = req.body;
  if (!date || !name) return res.status(400).json({ error: "Data e nome do feriado s\xE3o obrigat\xF3rios." });
  const hol = db.addHoliday({ date, name, type: type || "nacional" });
  res.status(201).json(hol);
});
app.get("/api/timesheet/:employeeId/:competence", (req, res) => {
  const { employeeId, competence } = req.params;
  const employee = db.getEmployeeById(employeeId);
  if (!employee) return res.status(404).json({ error: "Colaborador n\xE3o encontrado." });
  const schedule = db.getScheduleById(employee.shiftScheduleId);
  if (!schedule) return res.status(404).json({ error: "Escala n\xE3o encontrada." });
  const punches = db.getPunches(employeeId, competence);
  const holidays = db.getHolidays();
  const absences = db.getAbsences(employeeId);
  const closing = db.getClosingByCompetence(competence);
  const calc = calculateMonth(
    employee,
    competence,
    schedule,
    punches,
    holidays,
    absences,
    closing?.status === "fechado",
    closing?.closedAt,
    closing?.closedBy
  );
  res.json(calc);
});
app.get("/api/dashboard/stats", (req, res) => {
  const employees = db.getEmployees();
  const activeEmployees = employees.filter((e) => e.status === "ativo");
  const competence = req.query.competence || "2024-10";
  const todayDate = getServerSaoPauloTime().date;
  const todayPunches = db.getPunches().filter((p) => p.date === todayDate || p.date === "2024-10-24");
  const presentEmployeeIds = new Set(todayPunches.map((p) => p.employeeId));
  let totalAccumulatedOvertime = 14550;
  const pendingHomologations = [];
  pendingHomologations.push({
    id: "pend-1",
    employeeId: "emp-gf",
    employeeName: "Gabriel Ferreira",
    avatarInitials: "GF",
    roleDepartment: "Dev Backend \u2022 Time Alpha",
    date: "23 Out, 2024",
    dateRaw: "2024-10-23",
    reasonType: "Esquecimento Sa\xEDda",
    proposedTime: "18:05 (Intervalo 1h)",
    type: "saida",
    status: "pendente"
  });
  pendingHomologations.push({
    id: "pend-2",
    employeeId: "emp-pl",
    employeeName: "Patr\xEDcia Lima",
    avatarInitials: "PL",
    roleDepartment: "Product Designer \u2022 UI/UX",
    date: "22 Out, 2024",
    dateRaw: "2024-10-22",
    reasonType: "Consulta M\xE9dica (2h)",
    proposedTime: "14:00 \u2013 16:00 (Doc anexo)",
    type: "atestado",
    status: "pendente"
  });
  pendingHomologations.push({
    id: "pend-3",
    employeeId: "emp-tm",
    employeeName: "Thiago Mansur",
    avatarInitials: "TM",
    roleDepartment: "Analista Fiscal \u2022 Financeiro",
    date: "24 Out, 2024",
    dateRaw: "2024-10-24",
    reasonType: "Falha Leitor Biom\xE9trico",
    proposedTime: "09:02 (Entrada 1)",
    type: "entrada",
    status: "pendente"
  });
  const closing = db.getClosingByCompetence(competence);
  res.json({
    kpis: {
      activeEmployees: 148,
      activeDelta: "+12.5%",
      presentToday: 138,
      attendanceRate: "93.2%",
      overtimeAccumulatedMinutes: totalAccumulatedOvertime,
      overtimeFriendly: formatMinutesFriendly(totalAccumulatedOvertime),
      overtimeDelta: "+8.5%",
      overtimeTargetMinutes: 15600,
      // 260h
      pendingAdjustments: 14,
      pendingDelta: "-20%",
      oddPunchesCount: 8,
      waitingHomologationCount: 6,
      punctualityRate: "96.8%",
      punctualityDelta: "+2.4%",
      consolidatedDelaysCount: 12
    },
    closingProgress: {
      percentage: 75.6,
      validatedCount: 112,
      totalCount: 148,
      competenceLabel: "Out/2024",
      remainingDays: 6,
      cleanSheetsCount: 98,
      manualAdjustmentsCount: 14,
      pendingValidationCount: 36,
      status: closing?.status || "aberto"
    },
    departments: [
      { name: "Engenharia & Produto", overtimeMinutes: 5055, friendly: "84h 15m", delta: "-4%" },
      { name: "Opera\xE7\xF5es & Suporte", overtimeMinutes: 6160, friendly: "102h 40m", delta: "+6%" },
      { name: "Comercial & Expans\xE3o", overtimeMinutes: 3335, friendly: "55h 35m", delta: "-1%" }
    ],
    absencesDistribution: {
      totalCases: 26,
      breakdown: [
        { type: "Atestado M\xE9dico", count: 12, percentage: 45, color: "#3b82f6" },
        { type: "F\xE9rias Programadas", count: 9, percentage: 35, color: "#10b981" },
        { type: "Declara\xE7\xF5es & Aulas", count: 3, percentage: 12, color: "#f59e0b" },
        { type: "Outras Licen\xE7as", count: 2, percentage: 8, color: "#8b5cf6" }
      ]
    },
    pendingHomologations
  });
});
app.post("/api/closing/:competence", (req, res) => {
  const { competence } = req.params;
  const operatorName = req.body.operatorName || "Ana Clara Albuquerque (RH)";
  const employees = db.getEmployees(true);
  const holidays = db.getHolidays();
  const absences = db.getAbsences();
  let totalWorked = 0;
  let totalHE50 = 0;
  let totalHE100 = 0;
  let totalDeficit = 0;
  employees.forEach((emp) => {
    const schedule = db.getScheduleById(emp.shiftScheduleId);
    if (!schedule) return;
    const punches = db.getPunches(emp.id, competence);
    const empAbs = absences.filter((a) => a.employeeId === emp.id);
    const calc = calculateMonth(emp, competence, schedule, punches, holidays, empAbs);
    totalWorked += calc.totalWorkedMinutes;
    totalHE50 += calc.totalOvertime50Minutes;
    totalHE100 += calc.totalOvertime100Minutes;
    totalDeficit += calc.totalDeficitMinutes;
  });
  const closing = db.closeMonth(competence, operatorName, {
    totalWorkedMinutes: totalWorked,
    totalOvertime50Minutes: totalHE50,
    totalOvertime100Minutes: totalHE100,
    totalDeficitMinutes: totalDeficit,
    employeesValidated: employees.length,
    employeesTotal: employees.length
  });
  res.json({
    message: `Compet\xEAncia ${competence} fechada com sucesso! O banco de horas foi liquidado.`,
    closing
  });
});
app.post("/api/closing/:competence/reopen", (req, res) => {
  const { competence } = req.params;
  const { reason, operatorName } = req.body;
  if (!reason) {
    return res.status(400).json({ error: "Justificativa obrigat\xF3ria para reabertura de compet\xEAncia fechada." });
  }
  const closing = db.reopenMonth(competence, operatorName || "Admin Geral", reason);
  if (!closing) return res.status(404).json({ error: "Fechamento n\xE3o encontrado." });
  res.json({
    message: `Compet\xEAncia ${competence} reaberta com registro em auditoria.`,
    closing
  });
});
app.get("/api/pdf/timesheet/:employeeId/:competence", async (req, res) => {
  try {
    const { employeeId, competence } = req.params;
    const employee = db.getEmployeeById(employeeId);
    if (!employee) return res.status(404).send("Colaborador n\xE3o encontrado");
    const schedule = db.getScheduleById(employee.shiftScheduleId) || db.getSchedules()[0];
    const punches = db.getPunches(employeeId, competence);
    const holidays = db.getHolidays();
    const absences = db.getAbsences(employeeId);
    const closing = db.getClosingByCompetence(competence);
    const calc = calculateMonth(
      employee,
      competence,
      schedule,
      punches,
      holidays,
      absences,
      closing?.status === "fechado",
      closing?.closedAt,
      closing?.closedBy
    );
    const pdfBuffer = await generateTimesheetPDF(calc, db.getCompany());
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Espelho_Ponto_${employee.name.replace(/\s+/g, "_")}_${competence}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    res.status(500).send("Erro interno ao gerar PDF da folha de ponto.");
  }
});
app.get("/api/pdf/timesheet-batch/:competence", async (req, res) => {
  try {
    const { competence } = req.params;
    const employees = db.getEmployees(true);
    const company = db.getCompany();
    const holidays = db.getHolidays();
    const absences = db.getAbsences();
    const closing = db.getClosingByCompetence(competence);
    const zip = new JSZip();
    for (const emp of employees) {
      const schedule = db.getScheduleById(emp.shiftScheduleId) || db.getSchedules()[0];
      const punches = db.getPunches(emp.id, competence);
      const empAbs = absences.filter((a) => a.employeeId === emp.id);
      const calc = calculateMonth(
        emp,
        competence,
        schedule,
        punches,
        holidays,
        empAbs,
        closing?.status === "fechado",
        closing?.closedAt,
        closing?.closedBy
      );
      const pdfBuf = await generateTimesheetPDF(calc, company);
      zip.file(`Espelho_${emp.name.replace(/\s+/g, "_")}_${competence}.pdf`, pdfBuf);
    }
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Folhas_Ponto_Lote_${competence}.zip"`
    );
    res.send(zipBuffer);
  } catch (err) {
    console.error("Erro ao gerar lote ZIP:", err);
    res.status(500).send("Erro ao gerar lote de PDFs.");
  }
});
app.get("/api/export/excel/:competence", (req, res) => {
  try {
    const { competence } = req.params;
    const departmentFilter = req.query.department;
    let employees = db.getEmployees(true);
    if (departmentFilter && departmentFilter !== "todos") {
      employees = employees.filter((e) => e.department === departmentFilter);
    }
    const holidays = db.getHolidays();
    const absences = db.getAbsences();
    const closing = db.getClosingByCompetence(competence);
    const calculations = employees.map((emp) => {
      const schedule = db.getScheduleById(emp.shiftScheduleId) || db.getSchedules()[0];
      const punches = db.getPunches(emp.id, competence);
      const empAbs = absences.filter((a) => a.employeeId === emp.id);
      return calculateMonth(
        emp,
        competence,
        schedule,
        punches,
        holidays,
        empAbs,
        closing?.status === "fechado",
        closing?.closedAt,
        closing?.closedBy
      );
    });
    const excelBuffer = generateClosingExcel(competence, calculations);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Fechamento_Folha_${competence}.xlsx"`
    );
    res.send(excelBuffer);
  } catch (err) {
    console.error("Erro ao exportar Excel:", err);
    res.status(500).send("Erro ao exportar planilha Excel.");
  }
});
app.get("/api/audit-logs", (req, res) => {
  const employeeId = req.query.employeeId;
  res.json(db.getAuditLogs(employeeId));
});
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} PontoPro Enterprise Server running on http://0.0.0.0:${PORT}`);
  });
}
setupVite();
