import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  Building,
  Calendar,
  CreditCard,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import { Employee, ShiftSchedule } from '../types';
import { formatCPF, validateCPF } from '../services/timeCalculationEngine';

export const EmployeesView: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('Engenharia & Produto');
  const [admissionDate, setAdmissionDate] = useState('2024-01-15');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shiftScheduleId, setShiftScheduleId] = useState('sch-44h');
  const [pinCode, setPinCode] = useState('1234');
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = () => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then(setEmployees)
      .catch(console.error);

    fetch('/api/schedules')
      .then((res) => res.json())
      .then(setSchedules)
      .catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (emp: Employee) => {
    const newStatus = emp.status === 'ativo' ? 'inativo' : 'ativo';
    const reason = `Alteração de status do colaborador para ${newStatus} pelo painel de RH`;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason, operator: 'RH Admin' }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Erro ao atualizar colaborador:', err);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateCPF(cpf)) {
      setFormError('CPF inválido. Verifique os dígitos verificadores.');
      return;
    }

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          cpf,
          role,
          department,
          admissionDate,
          email,
          phone,
          shiftScheduleId,
          pinCode,
          operator: 'RH Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Erro ao cadastrar colaborador.');
        return;
      }

      setShowAddModal(false);
      setName('');
      setCpf('');
      setRole('');
      loadData();
    } catch (err) {
      setFormError('Erro ao comunicar com o servidor.');
    }
  };

  const filtered = employees.filter((emp) => {
    const matchSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cpf.includes(searchTerm) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDept = filterDepartment === 'todos' || emp.department === filterDepartment;
    const matchStatus = filterStatus === 'todos' || emp.status === filterStatus;

    return matchSearch && matchDept && matchStatus;
  });

  const departments = Array.from(new Set(employees.map((e) => e.department)));

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Gestão de Colaboradores</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastro de funcionários, escalas vinculadas e histórico preservado
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Colaborador</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filtrar por nome, CPF ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-hidden"
          >
            <option value="todos">Todos os Setores</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-hidden"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">Apenas Ativos</option>
            <option value="inativo">Apenas Inativos</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Colaborador</th>
                <th className="py-3 px-4">CPF</th>
                <th className="py-3 px-4">Setor & Cargo</th>
                <th className="py-3 px-4">Escala de Trabalho</th>
                <th className="py-3 px-4">Admissão</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((emp) => {
                const schedule = schedules.find((s) => s.id === emp.shiftScheduleId);
                const isActive = emp.status === 'ativo';

                return (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-200 shrink-0">
                          {emp.avatarInitials}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{emp.name}</div>
                          <div className="text-[11px] text-slate-400">{emp.email || 'Sem e-mail'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">{emp.cpf}</td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{emp.department}</div>
                      <div className="text-[11px] text-slate-400">{emp.role}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] border border-slate-700/60 font-medium">
                        {schedule?.name || '44h Padrão'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono">{emp.admissionDate}</td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isActive
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span>{isActive ? 'Ativo' : 'Inativo'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                          isActive
                            ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300'
                            : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60'
                        }`}
                        title="Nunca exclui colaborador com histórico: apenas inativa logicamente"
                      >
                        {isActive ? 'Inativar' : 'Reativar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro de Colaborador */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Cadastrar Novo Colaborador</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Gabriel Ferreira"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">CPF (Validado) *</label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Data de Admissão *</label>
                  <input
                    type="date"
                    required
                    value={admissionDate}
                    onChange={(e) => setAdmissionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Setor / Departamento *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Engenharia & Produto">Engenharia & Produto</option>
                    <option value="Operações & Suporte">Operações & Suporte</option>
                    <option value="Comercial & Expansão">Comercial & Expansão</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Recursos Humanos">Recursos Humanos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Cargo *</label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Dev Backend Pleno"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Escala de Trabalho</label>
                  <select
                    value={shiftScheduleId}
                    onChange={(e) => setShiftScheduleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
                  >
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.weeklyHoursMinutes / 60}h)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">PIN Quiosque (4 dígitos)</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
