import React, { useState } from 'react';
import { Clock, ShieldAlert, Trash2, CheckCircle2 } from 'lucide-react';
import { PunchRecord, PunchType, PUNCH_TYPE_LABELS } from '../types';

interface EditPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  employeeId: string;
  employeeName?: string;
  punchToEdit?: PunchRecord | null;
  defaultDate?: string;
}

export const EditPunchModal: React.FC<EditPunchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employeeId,
  employeeName,
  punchToEdit,
  defaultDate = '2024-10-24',
}) => {
  if (!isOpen) return null;

  const isEditing = !!punchToEdit;
  const [date, setDate] = useState(punchToEdit ? punchToEdit.date : defaultDate);
  const [time, setTime] = useState(punchToEdit ? punchToEdit.time.slice(0, 5) : '08:00');
  const [type, setType] = useState<PunchType>(punchToEdit ? punchToEdit.type : 'E1');
  const [justification, setJustification] = useState(punchToEdit?.editReason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!justification.trim()) {
      setError('A justificativa é obrigatória por determinação da Portaria MTP 671/2021.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && punchToEdit) {
        // Atualizar batida existente
        const res = await fetch(`/api/punches/${punchToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            time: `${time}:00`,
            type,
            justification,
            operatorName: 'RH Admin',
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Erro ao atualizar batida.');
          setLoading(false);
          return;
        }
      } else {
        // Criar batida manual
        const res = await fetch('/api/punches/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId,
            date,
            time: `${time}:00`,
            type,
            justification,
            operatorName: 'RH Admin',
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Erro ao incluir batida.');
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onSave();
      onClose();
    } catch (err) {
      setError('Erro de conexão com o servidor.');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!punchToEdit) return;
    if (!justification.trim()) {
      setError('Preencha a justificativa legal acima antes de desativar este registro.');
      return;
    }
    const reason = justification.trim();

    setLoading(true);
    try {
      const res = await fetch(`/api/punches/${punchToEdit.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justification: reason, operatorName: 'RH Admin' }),
      });
      if (res.ok) {
        onSave();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-base font-bold text-white">
              {isEditing ? 'Ajustar Batida de Ponto' : 'Inclusão Manual de Batida'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
          <strong>Portaria MTP 671/2021:</strong> O registro original jamais é apagado. Esta alteração
          gerará um apontamento de auditoria permanente com a sua justificativa.
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Data *</label>
              <input
                type="date"
                required
                disabled={isEditing}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-hidden focus:border-blue-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Horário (HH:MM) *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Tipo da Batida *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PunchType)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500"
            >
              <option value="E1">Entrada 1 (Início do Expediente)</option>
              <option value="S1">Saída 1 (Saída para Almoço/Intervalo)</option>
              <option value="E2">Entrada 2 (Retorno do Almoço/Intervalo)</option>
              <option value="S2">Saída 2 (Fim do Expediente)</option>
              <option value="E3">Entrada 3 (Turno Extraordinário)</option>
              <option value="S3">Saída 3 (Saída Turno Extraordinário)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Justificativa Legal Obrigatória *
            </label>
            <textarea
              required
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ex: Esquecimento de registro ao sair para intervalo; colaborador comunicou a liderança direta..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-blue-500 placeholder-slate-600"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desativar</span>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs"
              >
                {loading ? 'Salvando...' : 'Salvar Registro'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
