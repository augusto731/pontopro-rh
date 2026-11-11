import React, { useState, useEffect, useRef } from 'react';
import {
  Fingerprint,
  Clock,
  ShieldCheck,
  Camera,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Printer,
  ChevronLeft
} from 'lucide-react';
import { formatCPF } from '../services/timeCalculationEngine';

interface KioskReceipt {
  nsr: number;
  employeeName: string;
  maskedCpf: string;
  role: string;
  department: string;
  date: string;
  time: string;
  type: string;
  typeLabel: string;
  serverTimestamp: string;
  hash: string;
  companyName: string;
  companyCnpj: string;
}

export const KioskView: React.FC = () => {
  const [cpf, setCpf] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string>('--:--:--');
  const [serverDate, setServerDate] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<KioskReceipt | null>(null);
  const [countdown, setCountdown] = useState(10);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Busca e sincroniza horário do servidor a cada segundo
  useEffect(() => {
    const fetchTime = () => {
      fetch('/api/time')
        .then((res) => res.json())
        .then((data) => {
          setServerTime(data.serverTime);
          setServerDate(data.serverDate);
        })
        .catch(() => {});
    };
    fetchTime();
    const interval = setInterval(fetchTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown para reset automático após comprovante
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (receipt) {
      setCountdown(10);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleReset();
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [receipt]);

  // Teclado virtual touch
  const handleKeyClick = (char: string) => {
    if (usePin && cpf.replace(/\D/g, '').length === 11) {
      if (pinCode.length < 4) {
        setPinCode((prev) => prev + char);
      }
    } else {
      const clean = cpf.replace(/\D/g, '');
      if (clean.length < 11) {
        const next = clean + char;
        setCpf(formatCPF(next));
      }
    }
    setErrorMessage(null);
  };

  const handleBackspace = () => {
    if (usePin && pinCode.length > 0) {
      setPinCode((prev) => prev.slice(0, -1));
    } else {
      const clean = cpf.replace(/\D/g, '');
      if (clean.length > 0) {
        const next = clean.slice(0, -1);
        setCpf(formatCPF(next));
      }
    }
    setErrorMessage(null);
  };

  const handleClear = () => {
    setCpf('');
    setPinCode('');
    setErrorMessage(null);
  };

  const handleSubmitPunch = async () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setErrorMessage('Por favor, digite os 11 dígitos do seu CPF.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/quiosque/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf,
          pinCode: usePin ? pinCode : undefined,
          photoDataUrl: useCamera ? photoDataUrl : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erro ao registrar ponto.');
        setSubmitting(false);
        return;
      }

      setReceipt(data.receipt);
      setSubmitting(false);
    } catch (err) {
      setErrorMessage('Erro de conexão com o servidor de ponto.');
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setReceipt(null);
    setCpf('');
    setPinCode('');
    setErrorMessage(null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto py-4 px-2">
      {/* Receipt Screen (Comprovante de Registro de Ponto) */}
      {receipt ? (
        <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Comprovante de Registro de Ponto</h2>
                <p className="text-xs text-slate-400">Portaria MTP 671/2021 • REP-P Oficial</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 font-mono">Retorno automático em:</span>
              <div className="text-xl font-bold font-mono text-emerald-400">{countdown}s</div>
            </div>
          </div>

          {/* Receipt Body */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-3">
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">EMPRESA:</span>
              <span className="font-bold text-slate-200">{receipt.companyName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">CNPJ:</span>
              <span className="text-slate-200">{receipt.companyCnpj}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">COLABORADOR:</span>
              <span className="font-bold text-white">{receipt.employeeName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">CPF:</span>
              <span className="text-slate-200">{receipt.maskedCpf}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">CARGO / SETOR:</span>
              <span className="text-slate-200">{receipt.role} ({receipt.department})</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">TIPO DE REGISTRO:</span>
              <span className="font-bold text-blue-400">{receipt.typeLabel} ({receipt.type})</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">DATA / HORA SERVIDOR:</span>
              <span className="font-bold text-emerald-400 text-sm">{receipt.date} às {receipt.time}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">NSR (Nº SEQUENCIAL):</span>
              <span className="text-slate-200 font-bold">{receipt.nsr}</span>
            </div>
            <div className="pt-1">
              <div className="text-[10px] text-slate-400">ASSINATURA DIGITAL / HASH SHA-256:</div>
              <div className="text-[10px] text-slate-400 break-all select-all font-mono mt-0.5">
                {receipt.hash}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Imprimir Comprovante</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Novo Registro</span>
            </button>
          </div>
        </div>
      ) : (
        /* Kiosk Touch Interface */
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          {/* Top Clock Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800 text-center sm:text-left">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Fingerprint className="w-6 h-6 text-blue-500" />
                <h1 className="text-xl font-bold tracking-tight text-white">Registro de Ponto Eletrônico</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Horário sincronizado oficialmente via servidor NTP (America/Sao_Paulo)
              </p>
            </div>

            {/* Live Clock Display */}
            <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 inline-block">
              <div className="text-2xl font-extrabold font-mono text-emerald-400 tracking-tight">
                {serverTime}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                {serverDate || 'Hoje'}
              </div>
            </div>
          </div>

          {/* Security Toggles */}
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Modo Anti-Fraude Opcional:
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={usePin}
                  onChange={(e) => setUsePin(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600"
                />
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>PIN 4 dígitos</span>
              </label>
            </div>
          </div>

          {/* Input & Keypad Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: Input display */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Informe o seu CPF
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={cpf}
                    placeholder="000.000.000-00"
                    className="w-full text-2xl font-bold font-mono tracking-widest text-center py-4 px-4 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-hidden focus:border-blue-500 shadow-inner"
                  />
                  {cpf && (
                    <button
                      onClick={handleClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-400 hover:text-white"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {usePin && cpf.replace(/\D/g, '').length === 11 && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
                    Digite o seu PIN de 4 dígitos
                  </label>
                  <input
                    type="password"
                    readOnly
                    value={pinCode}
                    placeholder="••••"
                    maxLength={4}
                    className="w-full text-2xl font-bold font-mono tracking-widest text-center py-3 px-4 rounded-xl bg-slate-950 border-2 border-amber-600/80 text-amber-300"
                  />
                </div>
              )}

              {/* Error Message Display */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 flex items-center gap-2.5 text-xs text-rose-300 animate-in shake">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Information disclaimer */}
              <div className="p-3 rounded-lg bg-slate-950 text-[11px] text-slate-400 space-y-1">
                <div>• Sequência de batida calculada automaticamente pelo servidor.</div>
                <div>• Proteção anti-duplicidade: batidas consecutivas em menos de 1 min são bloqueadas.</div>
                <div>• Comprovante emitido com número NSR e hash criptográfico.</div>
              </div>

              {/* Confirm Punch Button */}
              <button
                onClick={handleSubmitPunch}
                disabled={submitting || cpf.replace(/\D/g, '').length !== 11}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-base font-bold shadow-lg transition active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-5 h-5" />
                <span>{submitting ? 'Registrando Ponto...' : 'Bater Ponto Agora'}</span>
              </button>
            </div>

            {/* Right: Touch Virtual Numeric Keypad */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="grid grid-cols-3 gap-2.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleKeyClick(digit)}
                    className="py-4 text-xl font-bold font-mono text-white rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-blue-600 transition shadow-xs border border-slate-800"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  className="py-4 text-xs font-semibold text-rose-400 rounded-lg bg-slate-900 hover:bg-slate-800 transition border border-slate-800"
                >
                  LIMPAR
                </button>
                <button
                  onClick={() => handleKeyClick('0')}
                  className="py-4 text-xl font-bold font-mono text-white rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-blue-600 transition shadow-xs border border-slate-800"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  className="py-4 text-xs font-semibold text-amber-400 rounded-lg bg-slate-900 hover:bg-slate-800 transition border border-slate-800"
                >
                  CORRIGIR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
