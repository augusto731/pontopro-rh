/**
 * Servidor Express Full-Stack para PontoPro
 * Integrado com Vite middleware, fuso horário America/Sao_Paulo e geração de PDF/Excel
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import JSZip from 'jszip';
import { db, hashPassword, verifyPassword } from './src/server/db.ts';
import { calculateMonth, formatCPF, formatMinutesFriendly, formatMinutesToTime, maskPartialCPF, validateCPF } from './src/services/timeCalculationEngine.ts';
import { generateTimesheetPDF } from './src/server/pdfGenerator.ts';
import { generateClosingExcel } from './src/server/excelGenerator.ts';
import { AbsenceType, AdjustmentRequest, AuthenticatedUser, PunchType, PUNCH_TYPE_LABELS, ProposedPunch, UserAccount, UserRole } from './src/types/index.ts';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const sessions = new Map<string, { accountId: string; expiresAt: number }>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

function getCookie(req: Request, name: string): string | undefined {
  const cookies = req.headers.cookie?.split(';') || [];
  const prefix = `${name}=`;
  return cookies.map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix))?.slice(prefix.length);
}

function toAuthenticatedUser(account: UserAccount): AuthenticatedUser {
  const employee = account.employeeId ? db.getEmployeeById(account.employeeId) : undefined;
  return {
    id: account.id,
    cpf: account.cpf,
    name: employee?.name || (account.isMaster ? 'Administrador Master' : 'Usuário'),
    employeeId: account.employeeId,
    role: account.role,
    isMaster: account.isMaster,
    mustChangePassword: account.mustChangePassword,
  };
}

function getAuthenticatedUser(req: Request): AuthenticatedUser | undefined {
  const token = getCookie(req, 'ponto_session');
  if (!token) return undefined;
  const session = sessions.get(token);
  if (!session) return undefined;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return undefined;
  }
  const account = db.getAccounts().find((item) => item.id === session.accountId && item.active);
  return account ? toAuthenticatedUser(account) : undefined;
}

function requireAuthentication(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next();
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Faça login para continuar.' });
  (req as AuthenticatedRequest).user = user;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
  next();
}

function setSessionCookie(res: Response, token: string, maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `ponto_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`);
}

// Express 4 não encaminha rejeições de Promises automaticamente.
const asyncHandler = (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper para obter data e hora atual no fuso America/Sao_Paulo
function getServerSaoPauloTime(): { date: string; time: string; iso: string; full: Date } {
  const now = new Date();
  // Formata para o fuso brasileiro
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  const date = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const time = `${partMap.hour}:${partMap.minute}:${partMap.second}`;
  const iso = `${date}T${time}-03:00`;

  return { date, time, iso, full: now };
}

// -------------------------------------------------------------
// ROTAS DE API
// -------------------------------------------------------------

// 1. Relógio Oficial do Servidor (America/Sao_Paulo)
app.get('/api/time', (req, res) => {
  const sTime = getServerSaoPauloTime();
  res.json({
    serverTime: sTime.time,
    serverDate: sTime.date,
    serverIso: sTime.iso,
    timezone: 'America/Sao_Paulo',
  });
});

app.get('/api/branding', (_req, res) => {
  const { name, logoDataUrl } = db.getCompany();
  res.json({ name, logoDataUrl });
});

app.get('/api/health', asyncHandler(async (_req, res) => {
  await db.ping();
  res.json({ status: 'ok', database: db.getStorageMode() });
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const cpf = String(req.body.cpf || '').replace(/\D/g, '');
  const password = String(req.body.password || '');
  const remoteAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const attemptKey = `${remoteAddress}:${cpf}`;
  const attempts = loginAttempts.get(attemptKey);
  if (attempts && attempts.resetAt > Date.now() && attempts.count >= 10) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' });
  }
  if (!validateCPF(cpf) || !password) {
    return res.status(400).json({ error: 'Informe um CPF válido e sua senha.' });
  }

  const account = db.getAccountByCpf(cpf);
  if (!account || !account.active || !verifyPassword(password, account.passwordHash)) {
    const current = attempts && attempts.resetAt > Date.now()
      ? attempts
      : { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
    current.count += 1;
    loginAttempts.set(attemptKey, current);
    return res.status(401).json({ error: 'CPF ou senha incorretos.' });
  }

  loginAttempts.delete(attemptKey);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { accountId: account.id, expiresAt: Date.now() + SESSION_TTL_MS });
  setSessionCookie(res, token, SESSION_TTL_MS / 1000);
  res.json({ user: toAuthenticatedUser(account) });
}));

app.get('/api/auth/me', (req, res) => {
  res.json({ user: getAuthenticatedUser(req) || null });
});

app.post('/api/auth/logout', (req, res) => {
  const token = getCookie(req, 'ponto_session');
  if (token) sessions.delete(token);
  setSessionCookie(res, '', 0);
  res.json({ message: 'Sessão encerrada.' });
});

app.use('/api', requireAuthentication);

app.post('/api/auth/change-password', asyncHandler(async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');
  const account = db.getAccounts().find((item) => item.id === user.id);
  if (!account || !verifyPassword(currentPassword, account.passwordHash)) {
    return res.status(401).json({ error: 'Senha atual incorreta.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'A nova senha precisa ser diferente da senha atual.' });
  }
  await db.mutate(() => db.updateAccountPassword(account.id, hashPassword(newPassword)));
  res.json({ message: 'Senha atualizada com sucesso.' });
}));

app.get('/api/auth/accounts', requireAdmin, (_req, res) => {
  const accounts = db.getAccounts().map((account) => ({
    cpf: account.cpf,
    employeeId: account.employeeId,
    employeeName: db.getEmployeeById(account.employeeId)?.name || (account.isMaster ? 'Administrador Master' : ''),
    role: account.role,
    isMaster: account.isMaster,
    active: account.active,
  }));
  res.json(accounts);
});

app.put('/api/auth/accounts/:cpf/role', requireAdmin, asyncHandler(async (req, res) => {
  const cpf = String(req.params.cpf).replace(/\D/g, '');
  const role = req.body.role as UserAccount['role'];
  if (!validateCPF(cpf) || !['ADMIN', 'COLABORADOR'].includes(role)) {
    return res.status(400).json({ error: 'CPF ou perfil inválido.' });
  }
  const account = db.getAccountByCpf(cpf);
  if (!account) return res.status(404).json({ error: 'Nenhum usuário cadastrado com este CPF.' });
  if (account.isMaster && role !== 'ADMIN') {
    return res.status(403).json({ error: 'O administrador master não pode perder o perfil de administrador.' });
  }
  await db.mutate(() => db.updateAccountRole(cpf, role));
  res.json({ message: 'Perfil atualizado.' });
}));

app.get('/api/competences', (_req, res) => {
  res.json(db.getCompetences());
});

app.post('/api/competences', requireAdmin, asyncHandler(async (req, res) => {
  const competence = String(req.body.competence || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) {
    return res.status(400).json({ error: 'Informe uma competência válida no formato mês/ano.' });
  }
  if (db.getCompetences().includes(competence)) {
    return res.status(409).json({ error: 'Esta competência já está cadastrada.' });
  }
  await db.mutate(() => db.addCompetence(competence));
  res.status(201).json({ competence });
}));

// 2. Configurações da Empresa
app.get('/api/company', (req, res) => {
  res.json(db.getCompany());
});

app.put('/api/company', requireAdmin, asyncHandler(async (req, res) => {
  const logo = req.body.logoDataUrl;
  if (logo !== undefined) {
    if (typeof logo !== 'string' || (logo && !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo))) {
      return res.status(400).json({ error: 'Envie a logo em PNG, JPEG ou WebP.' });
    }
    if (logo.length > 2_800_000) return res.status(413).json({ error: 'A logo deve ter no máximo 2 MB.' });
  }
  const updated = await db.mutate(() => db.updateCompany(req.body));
  res.json(updated);
}));

// 3. Colaboradores
app.get('/api/employees', (req, res) => {
  const onlyActive = req.query.onlyActive === 'true';
  const user = (req as AuthenticatedRequest).user!;
  const list = db.getEmployees(onlyActive).filter((employee) =>
    user.role === 'ADMIN' || employee.id === user.employeeId
  );
  res.json(list);
});

app.post('/api/employees/import', requireAdmin, asyncHandler(async (req, res) => {
  const rows: unknown = req.body.employees;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 1000) {
    return res.status(400).json({ error: 'Envie de 1 a 1.000 colaboradores para importar.' });
  }
  if (rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    return res.status(400).json({ error: 'A planilha contém linhas em formato inválido.' });
  }

  const importedRows = rows as Array<Record<string, unknown>>;
  const hasInvalidField = importedRows.some((row) =>
    ['name', 'cpf', 'birthDate', 'email', 'phone', 'role'].some(
      (field) => row[field] !== undefined && typeof row[field] !== 'string'
    ) || (row.rowNumber !== undefined &&
      (typeof row.rowNumber !== 'number' || !Number.isInteger(row.rowNumber) || row.rowNumber < 2))
  );
  if (hasInvalidField) {
    return res.status(400).json({ error: 'Os dados da planilha devem ser enviados como texto.' });
  }

  const result = await db.mutate(() => {
    const knownCpfs = new Set([
      ...db.getEmployees().map((employee) => employee.cpf.replace(/\D/g, '')).filter(Boolean),
      ...db.getAccounts().map((account) => account.cpf.replace(/\D/g, '')).filter(Boolean),
    ]);
    const knownEmails = new Set(
      db.getEmployees().map((employee) => employee.email.trim().toLowerCase()).filter(Boolean)
    );
    const skipped: Array<{ row: number; reason: string }> = [];
    let createdCount = 0;
    let incompleteCount = 0;

    importedRows.forEach((row, index) => {
      const rowNumber = Number(row.rowNumber ?? index + 2);
      const name = String(row.name ?? '').trim();
      const rawCpf = String(row.cpf ?? '').trim();
      const cpfDigits = rawCpf.replace(/\D/g, '');
      const cpf = cpfDigits.length === 11 ? formatCPF(cpfDigits) : rawCpf;
      const birthDate = String(row.birthDate ?? '').trim();
      const email = String(row.email ?? '').trim();
      const phone = String(row.phone ?? '').trim();
      const role = String(row.role ?? '').trim();
      const emailKey = email.toLowerCase();

      if ((cpfDigits && knownCpfs.has(cpfDigits)) || (emailKey && knownEmails.has(emailKey))) {
        skipped.push({ row: rowNumber, reason: 'CPF ou e-mail já cadastrado' });
        return;
      }

      const employee = db.addEmployee({
        name,
        cpf,
        birthDate,
        role,
        department: '',
        admissionDate: '',
        email,
        phone,
        shiftScheduleId: db.getSchedules()[0]?.id || 'sch-44h',
        status: 'ativo',
        pinCode: '',
      });

      db.addAuditLog({
        employeeId: employee.id,
        changedBy: String(req.body.operator || 'RH Admin'),
        previousValue: '[IMPORTAÇÃO DE PLANILHA]',
        newValue: `Colaborador ${name || '(sem nome)'} importado.`,
        reason: 'Importação de planilha',
        actionType: 'CREATE',
      });

      if (cpfDigits) knownCpfs.add(cpfDigits);
      if (emailKey) knownEmails.add(emailKey);
      if (!name || !cpf || !role || !employee.department || !employee.admissionDate) incompleteCount++;
      createdCount++;
    });

    return { createdCount, incompleteCount, skipped };
  });

  res.status(201).json(result);
}));

app.post('/api/employees', requireAdmin, asyncHandler(async (req, res) => {
  const { name, cpf, password, birthDate, role, department, admissionDate, email, phone, shiftScheduleId, pinCode } = req.body;

  if (!name || !cpf || !role || !department) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes (nome, cpf, cargo, setor).' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Defina uma senha com pelo menos 8 caracteres.' });
  }

  if (!validateCPF(cpf)) {
    return res.status(400).json({ error: 'CPF inválido.' });
  }

  if (db.getEmployeeByCpf(cpf) || db.getAccountByCpf(cpf)) {
    return res.status(400).json({ error: 'Já existe um usuário cadastrado com este CPF.' });
  }

  const newEmp = await db.mutate(() => {
    const newEmp = db.addEmployee({
    name,
    cpf,
    birthDate: birthDate || '1990-01-01',
    role,
    department,
    admissionDate: admissionDate || getServerSaoPauloTime().date,
    email: email || '',
    phone: phone || '',
    shiftScheduleId: shiftScheduleId || 'sch-44h',
    status: 'ativo',
    pinCode: pinCode || '',
  });
  db.addAccount({
    cpf: cpf.replace(/\D/g, ''),
    employeeId: newEmp.id,
    role: 'COLABORADOR',
    passwordHash: hashPassword(password),
    active: true,
    isMaster: false,
    mustChangePassword: false,
  });

  db.addAuditLog({
    employeeId: newEmp.id,
    changedBy: req.body.operator || 'RH Admin',
    previousValue: '[NOVO CADASTRO]',
    newValue: `Colaborador ${newEmp.name} (CPF ${newEmp.cpf}) cadastrado.`,
    reason: 'Admissão de colaborador',
    actionType: 'CREATE',
  });
    return newEmp;
  });

  res.status(201).json(newEmp);
}));

app.put('/api/employees/:id', requireAdmin, asyncHandler(async (req, res) => {
  const current = db.getEmployeeById(req.params.id);
  if (!current) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  const cpf = String(req.body.cpf ?? current.cpf).replace(/\D/g, '');
  if (req.body.cpf !== undefined && cpf && !validateCPF(cpf)) {
    return res.status(400).json({ error: 'CPF inválido.' });
  }
  if (cpf && validateCPF(cpf)) {
    const duplicateEmployee = db.getEmployeeByCpf(cpf);
    const duplicateAccount = db.getAccountByCpf(cpf);
    if ((duplicateEmployee && duplicateEmployee.id !== current.id) ||
        (duplicateAccount && duplicateAccount.employeeId !== current.id)) {
      return res.status(409).json({ error: 'Já existe um usuário cadastrado com este CPF.' });
    }
  }
  const password = req.body.password === undefined ? '' : String(req.body.password);
  if (password && password.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }
  const updates = {
    name: String(req.body.name ?? current.name).trim(),
    cpf,
    role: String(req.body.role ?? current.role).trim(),
    department: String(req.body.department ?? current.department).trim(),
    admissionDate: String(req.body.admissionDate ?? current.admissionDate),
    birthDate: String(req.body.birthDate ?? current.birthDate),
    email: String(req.body.email ?? current.email),
    phone: String(req.body.phone ?? current.phone),
    shiftScheduleId: String(req.body.shiftScheduleId ?? current.shiftScheduleId),
    status: req.body.status === 'inativo' ? 'inativo' as const : req.body.status === 'ativo' ? 'ativo' as const : current.status,
    pinCode: String(req.body.pinCode ?? current.pinCode ?? ''),
  };
  const isProfileUpdate = ['name', 'role', 'department', 'admissionDate', 'birthDate', 'email', 'phone', 'shiftScheduleId', 'pinCode']
    .some((field) => req.body[field] !== undefined);
  if (isProfileUpdate && (!updates.name || !updates.role || !updates.department)) {
    return res.status(400).json({ error: 'Nome, cargo e departamento são obrigatórios.' });
  }

  const updated = await db.mutate(() => {
    const updated = db.updateEmployee(req.params.id, updates);
    if (!updated) return null;
    db.updateEmployeeAccount(updated.id, cpf, password ? hashPassword(password) : undefined);
    db.setAccountActiveForEmployee(updated.id, updated.status === 'ativo');
    db.addAuditLog({
    employeeId: updated.id,
    changedBy: req.body.operator || 'RH Admin',
    previousValue: 'Dados anteriores',
    newValue: `Colaborador atualizado. Status: ${updated.status}`,
    reason: req.body.reason || 'Atualização cadastral',
    actionType: 'UPDATE',
  });
    return updated;
  });
  if (!updated) return res.status(404).json({ error: 'Colaborador não encontrado.' });

  res.json(updated);
}));

// 4. Escalas de Trabalho
app.get('/api/schedules', requireAdmin, (req, res) => {
  res.json(db.getSchedules());
});

app.post('/api/schedules', requireAdmin, asyncHandler(async (req, res) => {
  const schedule = await db.mutate(() => db.addSchedule(req.body));
  res.status(201).json(schedule);
}));

app.put('/api/schedules/:id', requireAdmin, asyncHandler(async (req, res) => {
  const updated = await db.mutate(() => db.updateSchedule(req.params.id, req.body));
  if (!updated) return res.status(404).json({ error: 'Escala não encontrada.' });
  res.json(updated);
}));

// 5. REGISTRO DE PONTO PÚBLICO (QUIOSQUE TABLET)
app.post('/api/quiosque/punch', asyncHandler(async (req, res) => {
  const { cpf, pinCode, photoDataUrl } = req.body;
  if (!cpf) {
    return res.status(400).json({ error: 'Informe o CPF do colaborador.' });
  }

  const user = (req as AuthenticatedRequest).user!;
  const employee = user.role === 'ADMIN'
    ? db.getEmployeeByCpf(cpf)
    : user.employeeId && user.cpf === String(cpf).replace(/\D/g, '')
      ? db.getEmployeeById(user.employeeId)
      : undefined;
  if (user.role !== 'ADMIN' && !employee) {
    return res.status(403).json({ error: 'O registro só pode ser realizado para o usuário autenticado.' });
  }
  if (!employee) {
    return res.status(404).json({ error: 'Colaborador não encontrado com este CPF.' });
  }

  if (employee.status !== 'ativo') {
    return res.status(403).json({ error: 'Colaborador inativo na empresa. Contate o RH.' });
  }

  // Validação opcional de PIN
  if (employee.pinCode && pinCode && employee.pinCode !== pinCode) {
    return res.status(401).json({ error: 'PIN de segurança incorreto.' });
  }

  // Horário oficial do servidor
  const sTime = getServerSaoPauloTime();
  const dateStr = sTime.date;
  const timeStr = sTime.time;

  // Proteção contra duplicidade: bloqueio de batidas repetidas em menos de 1 minuto
  const todayPunches = db.getPunches(employee.id).filter((p) => p.date === dateStr);
  if (todayPunches.length > 0) {
    const lastPunch = todayPunches[todayPunches.length - 1];
    const lastTimeSec = new Date(lastPunch.serverTimestamp).getTime();
    const currTimeSec = sTime.full.getTime();
    const diffSeconds = Math.abs(currTimeSec - lastTimeSec) / 1000;

    if (diffSeconds < 60) {
      return res.status(429).json({
        error: `Aguarde pelo menos 1 minuto entre registros consecutivos. Última batida às ${lastPunch.time.slice(0, 5)}.`,
      });
    }
  }

  // Definição automática do tipo da batida em sequência
  const count = todayPunches.length;
  const sequenceTypes: PunchType[] = ['E1', 'S1', 'E2', 'S2', 'E3', 'S3'];
  const punchType: PunchType = sequenceTypes[count] || 'E3';

  // Obter IP do cliente e user agent
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Tablet Quiosque';

  const punch = await db.mutate(() => db.addPunch({
    employeeId: employee.id,
    date: dateStr,
    time: timeStr,
    serverTimestamp: sTime.iso,
    type: punchType,
    origin: 'quiosque',
    ip,
    userAgent,
    isEdited: false,
    photoDataUrl: photoDataUrl || undefined,
  }));

  // Retorna o comprovante do registro de ponto.
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
    companyCnpj: db.getCompany().cnpj,
  };

  res.status(201).json({
    message: 'Ponto registrado com sucesso!',
    receipt,
  });
}));

// 6. Inclusão manual pelo RH
app.post('/api/punches/manual', requireAdmin, asyncHandler(async (req, res) => {
  const { employeeId, date, time, type, justification, operatorName } = req.body;

  if (!employeeId || !date || !time || !type || !justification) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios, incluindo a justificativa.' });
  }

  const employee = db.getEmployeeById(employeeId);
  if (!employee) return res.status(404).json({ error: 'Colaborador não encontrado.' });

  const sTime = getServerSaoPauloTime();
  const punch = await db.mutate(() => {
    const punch = db.addPunch({
    employeeId,
    date,
    time: time.length === 5 ? `${time}:00` : time,
    serverTimestamp: `${date}T${time}:00-03:00`,
    type: type as PunchType,
    origin: 'manual',
    ip: req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Painel RH',
    isEdited: true,
    editReason: justification,
    editedBy: operatorName || 'RH Admin',
    editedAt: sTime.iso,
  });

  db.addAuditLog({
    punchId: punch.id,
    employeeId,
    changedBy: operatorName || 'RH Admin',
    previousValue: '[SEM REGISTRO]',
    newValue: `Batida manual ${punch.type} às ${punch.time} em ${punch.date}`,
    reason: justification,
    actionType: 'CREATE',
  });
    return punch;
  });

  res.status(201).json(punch);
}));

// 7. Edição de batida pelo RH
app.put('/api/punches/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { time, type, justification, operatorName } = req.body;
  if (!time || !justification) {
    return res.status(400).json({ error: 'Horário e justificativa são obrigatórios.' });
  }

  const updated = await db.mutate(() => db.updatePunch(req.params.id, {
    time: time.length === 5 ? `${time}:00` : time,
    type,
    editReason: justification,
    editedBy: operatorName || 'RH Admin',
  }));

  if (!updated) return res.status(404).json({ error: 'Registro de ponto não encontrado.' });
  res.json(updated);
}));

// 8. Exclusão de batida pelo RH
app.delete('/api/punches/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { justification, operatorName } = req.body;
  if (!justification) {
    return res.status(400).json({ error: 'Justificativa obrigatória para desativação de registro de ponto.' });
  }

  const success = await db.mutate(() => db.deletePunch(req.params.id, justification, operatorName || 'RH Admin'));
  if (!success) return res.status(404).json({ error: 'Registro de ponto não encontrado.' });

  res.json({ message: 'Registro de ponto desativado com trilha de auditoria preservada.' });
}));

// 9. Ausências e Afastamentos
app.get('/api/absences', (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const requestedEmployeeId = req.query.employeeId as string | undefined;
  const employeeId = user.role === 'ADMIN' ? requestedEmployeeId : user.employeeId;
  res.json(db.getAbsences(employeeId));
});

app.post('/api/absences', requireAdmin, asyncHandler(async (req, res) => {
  const { employeeId, type, startDate, endDate, abonaHoras, abonoMinutosPorDia, observation, attachmentName, operatorName } = req.body;
  if (!employeeId || !type || !startDate || !endDate) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }
  if (!db.getEmployeeById(employeeId)) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
    return res.status(400).json({ error: 'Informe um período de ausência válido.' });
  }
  if (abonaHoras !== undefined && typeof abonaHoras !== 'boolean') {
    return res.status(400).json({ error: 'A opção de abono de horas é inválida.' });
  }
  if (abonaHoras && abonoMinutosPorDia !== undefined &&
      (!Number.isInteger(abonoMinutosPorDia) || abonoMinutosPorDia < 1 || abonoMinutosPorDia > 1440)) {
    return res.status(400).json({ error: 'As horas de abono devem ser entre 1 minuto e 24 horas por dia.' });
  }

  const newAbs = await db.mutate(() => {
    const newAbs = db.addAbsence({
    employeeId,
    type,
    startDate,
    endDate,
    abonaHoras: abonaHoras ?? true,
    abonoMinutosPorDia: abonaHoras && Number.isInteger(abonoMinutosPorDia) ? abonoMinutosPorDia : undefined,
    observation: observation || '',
    attachmentName: attachmentName || undefined,
    status: 'aprovado',
    approvedBy: operatorName || 'RH Admin',
    approvedAt: new Date().toISOString(),
  });

  db.addAuditLog({
    employeeId,
    changedBy: operatorName || 'RH Admin',
    previousValue: '[SEM AFASTAMENTO]',
    newValue: `Ausência ${type} de ${startDate} até ${endDate} (Abona: ${newAbs.abonaHoras ? 'Sim' : 'Não'})`,
    reason: observation || 'Lançamento de ausência justificada',
    actionType: 'CREATE',
  });
    return newAbs;
  });

  res.status(201).json(newAbs);
}));

app.put('/api/absences/:id/status', requireAdmin, asyncHandler(async (req, res) => {
  const { status, operatorName } = req.body;
  const updated = await db.mutate(() => db.updateAbsenceStatus(req.params.id, status, operatorName || 'RH Admin'));
  if (!updated) return res.status(404).json({ error: 'Ausência não encontrada.' });
  res.json(updated);
}));

app.put('/api/absences/:id', requireAdmin, asyncHandler(async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const { employeeId, type, startDate, endDate, abonaHoras, abonoMinutosPorDia, observation, attachmentName } = req.body;
  const absenceTypes: AbsenceType[] = ['Atestado', 'Declaração', 'Consulta', 'Folga', 'Feriado', 'Outros', 'Férias'];
  if (!employeeId || !absenceTypes.includes(type) || typeof abonaHoras !== 'boolean') {
    return res.status(400).json({ error: 'Informe colaborador, tipo e opção de abono válidos.' });
  }
  if (!db.getEmployeeById(employeeId)) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
    return res.status(400).json({ error: 'Informe um período de ausência válido.' });
  }
  if (abonaHoras && abonoMinutosPorDia !== undefined &&
      (!Number.isInteger(abonoMinutosPorDia) || abonoMinutosPorDia < 1 || abonoMinutosPorDia > 1440)) {
    return res.status(400).json({ error: 'O abono deve ser entre 1 minuto e 24 horas por dia.' });
  }
  const updated = await db.mutate(() => db.updateAbsence(req.params.id, {
    employeeId,
    type,
    startDate,
    endDate,
    abonaHoras,
    abonoMinutosPorDia: abonaHoras ? abonoMinutosPorDia : undefined,
    observation: observation || '',
    attachmentName: attachmentName || undefined,
  }, user.name));
  if (!updated) return res.status(404).json({ error: 'Ausência não encontrada.' });
  res.json(updated);
}));

app.get('/api/adjustment-requests', (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  res.json(db.getAdjustmentRequests(user.role === 'ADMIN' ? undefined : user.employeeId));
});

app.post('/api/adjustment-requests', asyncHandler(async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const employeeId = user.employeeId;
  if (user.role !== 'COLABORADOR' || !employeeId) {
    return res.status(403).json({ error: 'Somente colaboradores vinculados podem solicitar ajustes.' });
  }
  const { date, proposedPunches, reason } = req.body;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(proposedPunches) ||
      proposedPunches.length < 1 || proposedPunches.length > 6 ||
      typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500) {
    return res.status(400).json({ error: 'Informe a data, de 1 a 6 marcações e uma justificativa de 5 a 500 caracteres.' });
  }
  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    return res.status(400).json({ error: 'Informe uma data válida para o ajuste.' });
  }
  if (date > getServerSaoPauloTime().date) {
    return res.status(400).json({ error: 'Não é possível solicitar ajuste para uma data futura.' });
  }
  const month = date.slice(0, 7);
  if (db.getClosingByCompetence(month)?.status === 'fechado') {
    return res.status(409).json({ error: 'A competência já foi fechada e não aceita solicitações de ajuste.' });
  }
  const punches = db.getPunches(employeeId, month).filter((punch) => punch.date === date);
  const allowedTypes: PunchType[] = ['E1', 'S1', 'E2', 'S2', 'E3', 'S3'];
  const validatedPunches: ProposedPunch[] = proposedPunches.map((punch: ProposedPunch, index: number) => ({
    type: punch?.type,
    time: punch?.time,
  }));
  if (validatedPunches.some((punch) =>
    !allowedTypes.includes(punch.type) || typeof punch.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(punch.time)
  )) {
    return res.status(400).json({ error: 'Informe horários válidos no formato HH:MM.' });
  }
  if (new Set(validatedPunches.map((punch) => punch.type)).size !== validatedPunches.length) {
    return res.status(400).json({ error: 'Cada marcação deve ter um tipo diferente.' });
  }
  const sortedPunches = validatedPunches.slice().sort((a, b) => a.time.localeCompare(b.time));
  if (sortedPunches.some((punch, index) => index > 0 && punch.time <= sortedPunches[index - 1].time)) {
    return res.status(400).json({ error: 'Informe as marcações em ordem cronológica, sem horários repetidos.' });
  }
  let request: AdjustmentRequest | undefined;
  try {
    request = await db.mutate(() => db.addAdjustmentRequest({
      employeeId,
      requestedBy: user.name,
      date,
      currentPunches: punches.map(({ type, time }) => ({ type, time })),
      proposedPunches: sortedPunches,
      reason: reason.trim(),
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes('solicitação pendente')) {
      return res.status(409).json({ error: error.message });
    }
    throw error;
  }
  res.status(201).json(request);
}));

app.put('/api/adjustment-requests/:id/review', requireAdmin, asyncHandler(async (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  const { status, reviewNote } = req.body;
  if (status !== 'aprovado' && status !== 'rejeitado') {
    return res.status(400).json({ error: 'A decisão deve ser aprovar ou rejeitar.' });
  }
  if (reviewNote !== undefined && (typeof reviewNote !== 'string' || reviewNote.length > 500)) {
    return res.status(400).json({ error: 'A observação deve ter até 500 caracteres.' });
  }
  let updated: AdjustmentRequest | null | undefined;
  try {
    updated = await db.mutate(() => db.reviewAdjustmentRequest(
      req.params.id,
      status,
      user.name,
      reviewNote?.trim() || ''
    ));
  } catch (error) {
    if (error instanceof Error && error.message.includes('alteradas após a solicitação')) {
      return res.status(409).json({ error: error.message });
    }
    throw error;
  }
  if (!updated) return res.status(404).json({ error: 'Solicitação não encontrada ou já analisada.' });
  res.json(updated);
}));

// 10. Feriados
app.get('/api/holidays', (req, res) => {
  res.json(db.getHolidays());
});

app.post('/api/holidays', requireAdmin, asyncHandler(async (req, res) => {
  const { date, name, type } = req.body;
  if (!date || !name) return res.status(400).json({ error: 'Data e nome do feriado são obrigatórios.' });
  const hol = await db.mutate(() => db.addHoliday({ date, name, type: type || 'nacional' }));
  res.status(201).json(hol);
}));

// 11. Espelho de Ponto Calculado (Mês/Colaborador)
app.get('/api/timesheet/:employeeId/:competence', (req, res) => {
  const { employeeId, competence } = req.params;
  const user = (req as AuthenticatedRequest).user!;
  if (user.role !== 'ADMIN' && user.employeeId !== employeeId) {
    return res.status(403).json({ error: 'Você só pode consultar a sua própria folha de ponto.' });
  }
  const employee = db.getEmployeeById(employeeId);
  if (!employee) return res.status(404).json({ error: 'Colaborador não encontrado.' });

  const schedule = db.getScheduleById(employee.shiftScheduleId);
  if (!schedule) return res.status(404).json({ error: 'Escala não encontrada.' });

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
    closing?.status === 'fechado',
    closing?.closedAt,
    closing?.closedBy
  );

  res.json(calc);
});

// 12. Indicadores do painel
app.get('/api/dashboard/stats', requireAdmin, (req, res) => {
  const activeEmployees = db.getEmployees(true);
  const competence = req.query.competence as string || db.getCompetences()[0] || getServerSaoPauloTime().date.slice(0, 7);
  const todayDate = getServerSaoPauloTime().date;
  const todayPunches = db.getPunches().filter((p) => p.date === todayDate);
  const presentEmployeeIds = new Set(todayPunches.map((p) => p.employeeId));
  let totalOvertimeMinutes = 0;
  let pendingAdjustments = 0;
  for (const employee of activeEmployees) {
    const schedule = db.getScheduleById(employee.shiftScheduleId);
    if (!schedule) continue;
    const calculation = calculateMonth(
      employee,
      competence,
      schedule,
      db.getPunches(employee.id, competence),
      db.getHolidays(),
      db.getAbsences(employee.id)
    );
    totalOvertimeMinutes += calculation.totalOvertime50Minutes + calculation.totalOvertime100Minutes;
    pendingAdjustments += calculation.days.filter((day) => day.hasInconsistency).length;
  }
  const closing = db.getClosingByCompetence(competence);
  res.json({
    kpis: {
      activeEmployees: activeEmployees.length,
      presentToday: presentEmployeeIds.size,
      attendanceRate: activeEmployees.length ? `${((presentEmployeeIds.size / activeEmployees.length) * 100).toFixed(1)}%` : '0%',
      overtimeAccumulatedMinutes: totalOvertimeMinutes,
      overtimeFriendly: formatMinutesFriendly(totalOvertimeMinutes),
      pendingAdjustments,
    },
    closingProgress: {
      percentage: activeEmployees.length ? Math.round(((activeEmployees.length - Math.min(pendingAdjustments, activeEmployees.length)) / activeEmployees.length) * 100) : 0,
      validatedCount: Math.max(0, activeEmployees.length - pendingAdjustments),
      totalCount: activeEmployees.length,
      competenceLabel: competence,
      remainingDays: 0,
      cleanSheetsCount: Math.max(0, activeEmployees.length - pendingAdjustments),
      manualAdjustmentsCount: pendingAdjustments,
      pendingValidationCount: pendingAdjustments,
      status: closing?.status || 'aberto',
    },
  });
});

// 13. Fechamento de Mês
app.get('/api/closing/:competence', requireAdmin, (req, res) => {
  res.json(db.getClosingByCompetence(req.params.competence) || null);
});

app.post('/api/closing/:competence', requireAdmin, asyncHandler(async (req, res) => {
  const { competence } = req.params;
  const operatorName = req.body.operatorName || 'Ana Clara Albuquerque (RH)';

  // Validação dos colaboradores e soma dos totais
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

  const closing = await db.mutate(() => db.closeMonth(competence, operatorName, {
    totalWorkedMinutes: totalWorked,
    totalOvertime50Minutes: totalHE50,
    totalOvertime100Minutes: totalHE100,
    totalDeficitMinutes: totalDeficit,
    employeesValidated: employees.length,
    employeesTotal: employees.length,
  }));

  res.json({
    message: `Competência ${competence} fechada com sucesso! O banco de horas foi liquidado.`,
    closing,
  });
}));

// 14. Reabertura de Mês (Somente Admin com justificativa)
app.post('/api/closing/:competence/reopen', requireAdmin, asyncHandler(async (req, res) => {
  const { competence } = req.params;
  const { reason, operatorName } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Justificativa obrigatória para reabertura de competência fechada.' });
  }

  const closing = await db.mutate(() => db.reopenMonth(competence, operatorName || 'Admin Geral', reason));
  if (!closing) return res.status(404).json({ error: 'Fechamento não encontrado.' });

  res.json({
    message: `Competência ${competence} reaberta com registro em auditoria.`,
    closing,
  });
}));

// 15. Geração de PDF Individual (A4 Paisagem)
app.get('/api/pdf/timesheet/:employeeId/:competence', async (req, res) => {
  try {
    const { employeeId, competence } = req.params;
    const user = (req as AuthenticatedRequest).user!;
    if (user.role !== 'ADMIN' && user.employeeId !== employeeId) {
      return res.status(403).send('Você só pode consultar a sua própria folha de ponto.');
    }
    const employee = db.getEmployeeById(employeeId);
    if (!employee) return res.status(404).send('Colaborador não encontrado');

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
      closing?.status === 'fechado',
      closing?.closedAt,
      closing?.closedBy
    );

    const pdfBuffer = await generateTimesheetPDF(calc, db.getCompany());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Espelho_Ponto_${employee.name.replace(/\s+/g, '_')}_${competence}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    res.status(500).send('Erro interno ao gerar PDF da folha de ponto.');
  }
});

// 16. Geração de Lote de PDFs em ZIP
app.get('/api/pdf/timesheet-batch/:competence', async (req, res) => {
  try {
    if ((req as AuthenticatedRequest).user?.role !== 'ADMIN') {
      return res.status(403).send('Acesso restrito aos administradores.');
    }
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
        closing?.status === 'fechado',
        closing?.closedAt,
        closing?.closedBy
      );

      const pdfBuf = await generateTimesheetPDF(calc, company);
      zip.file(`Espelho_${emp.name.replace(/\s+/g, '_')}_${competence}.pdf`, pdfBuf);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Folhas_Ponto_Lote_${competence}.zip"`
    );
    res.send(zipBuffer);
  } catch (err) {
    console.error('Erro ao gerar lote ZIP:', err);
    res.status(500).send('Erro ao gerar lote de PDFs.');
  }
});

// 17. Exportação Excel (.xlsx)
app.get('/api/export/excel/:competence', (req, res) => {
  try {
    if ((req as AuthenticatedRequest).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
    }
    const { competence } = req.params;
    const departmentFilter = req.query.department as string | undefined;
    let employees = db.getEmployees(true);

    if (departmentFilter && departmentFilter !== 'todos') {
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
        closing?.status === 'fechado',
        closing?.closedAt,
        closing?.closedBy
      );
    });

    const excelBuffer = generateClosingExcel(competence, calculations);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Fechamento_Folha_${competence}.xlsx"`
    );
    res.send(excelBuffer);
  } catch (err) {
    console.error('Erro ao exportar Excel:', err);
    res.status(500).send('Erro ao exportar planilha Excel.');
  }
});

// 18. Histórico de alterações
app.get('/api/audit-logs', (req, res) => {
  const user = (req as AuthenticatedRequest).user!;
  if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso restrito aos administradores.' });
  const employeeId = req.query.employeeId as string | undefined;
  res.json(db.getAuditLogs(employeeId));
});

// -------------------------------------------------------------
// INTEGRAÇÃO VITE / SPA
// -------------------------------------------------------------
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await db.initialize();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PontoPro Enterprise Server running on http://0.0.0.0:${PORT}`);
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro interno:', error);
  if (!res.headersSent) res.status(500).json({ error: 'Erro interno ao salvar ou consultar dados.' });
});

setupVite().catch(err => {
  console.error('Falha ao iniciar aplicação:', err);
  process.exit(1);
});
