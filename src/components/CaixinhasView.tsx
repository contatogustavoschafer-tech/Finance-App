import React, { useState } from 'react';
import {
  PiggyBank,
  TrendingUp,
  ShieldAlert,
  Award,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Plus,
  Coins,
  Target,
  Flame,
  Zap,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrencyBRL } from '../constants/categories';

interface CaixinhasViewProps {
  transactions: Transaction[];
  themeMode: 'black' | 'light';
  onOpenNewTransaction: () => void;
}

interface CaixinhaGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  color: string;
  badge: string;
  description: string;
}

export const CaixinhasView: React.FC<CaixinhasViewProps> = ({
  transactions,
  themeMode,
  onOpenNewTransaction,
}) => {
  const isBlack = themeMode === 'black';

  // Calculate total saved in caixinha category or general savings
  const caixinhaTransactions = transactions.filter(
    (t) => t.category.toLowerCase().includes('caixinha') || t.category.toLowerCase().includes('reserva') || t.category.toLowerCase().includes('investimentos')
  );
  const totalCaixinhaSaved = caixinhaTransactions.reduce((acc, t) => acc + (t.type === 'RECEITA' ? t.amount : t.amount), 0);

  // Default goals requested by user: 1000, 2500, 5000, 10000, 15000, 20000
  const [goals, setGoals] = useState<CaixinhaGoal[]>([
    {
      id: 'g1',
      name: 'Reserva Inicial - R$ 1.000',
      targetAmount: 1000,
      currentAmount: Math.min(1000, Math.max(250, totalCaixinhaSaved * 0.2)),
      icon: 'Coins',
      color: 'from-amber-600 to-amber-800',
      badge: 'Bronze',
      description: 'Primeiro passo para a segurança financeira.',
    },
    {
      id: 'g2',
      name: 'Fôlego - R$ 2.500',
      targetAmount: 2500,
      currentAmount: Math.min(2500, Math.max(500, totalCaixinhaSaved * 0.4)),
      icon: 'ShieldAlert',
      color: 'from-slate-400 to-slate-600',
      badge: 'Prata',
      description: 'Garante tranquilidade por até 1 mês.',
    },
    {
      id: 'g3',
      name: 'Reserva Parcial - R$ 5.000',
      targetAmount: 5000,
      currentAmount: Math.min(5000, Math.max(1200, totalCaixinhaSaved * 0.6)),
      icon: 'Target',
      color: 'from-yellow-500 to-amber-600',
      badge: 'Ouro',
      description: 'Proteção sólida contra imprevistos médios.',
    },
    {
      id: 'g4',
      name: 'Segurança Sólida - R$ 10.000',
      targetAmount: 10000,
      currentAmount: Math.min(10000, Math.max(2500, totalCaixinhaSaved * 0.8)),
      icon: 'Award',
      color: 'from-cyan-500 to-blue-600',
      badge: 'Platina',
      description: 'Autonomia e poder de negociação em investimentos.',
    },
    {
      id: 'g5',
      name: 'Liberdade - R$ 15.000',
      targetAmount: 15000,
      currentAmount: Math.min(15000, Math.max(4000, totalCaixinhaSaved * 0.9)),
      icon: 'Sparkles',
      color: 'from-violet-500 to-purple-700',
      badge: 'Diamante',
      description: 'Patamar avançado de capital guardado.',
    },
    {
      id: 'g6',
      name: 'Independência - R$ 20.000',
      targetAmount: 20000,
      currentAmount: Math.min(20000, totalCaixinhaSaved),
      icon: 'Flame',
      color: 'from-emerald-500 to-teal-700',
      badge: 'Esmeralda',
      description: 'Consolidação de patrimônio e renda passiva robusta.',
    },
  ]);

  // Simulator state
  const [monthlyContribution, setMonthlyContribution] = useState<number>(500);
  const [annualRate, setAnnualRate] = useState<number>(10); // 10% a.a.

  const monthlyRate = annualRate / 100 / 12;

  const calculateFV = (months: number) => {
    if (monthlyRate === 0) return monthlyContribution * months;
    return monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  };

  const fv10Years = calculateFV(120); // 10 years
  const fv15Years = calculateFV(180); // 15 years

  const passiveIncome10 = fv10Years * monthlyRate;
  const passiveIncome15 = fv15Years * monthlyRate;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-xl relative overflow-hidden transition-colors ${
        isBlack
          ? 'bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-950 border-emerald-900/40 text-zinc-100'
          : 'bg-gradient-to-r from-emerald-50 via-white to-teal-50 border-emerald-200 text-slate-900 shadow-sm'
      }`}>
        <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isBlack ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              <PiggyBank className="w-3.5 h-3.5" />
              <span>Caixinhas Inteligentes & Metas de Longo Prazo</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
              Construção de Patrimônio & Futuro
            </h1>
            <p className={`text-sm max-w-2xl ${isBlack ? 'text-zinc-400' : 'text-slate-600'}`}>
              Acompanhe suas metas fixas de emergência, conquiste insígnias de evolução e simule o poder dos juros compostos em 10 ou 15 anos para multiplicar seu dinheiro.
            </p>
          </div>
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Guardar na Caixinha Agora</span>
          </button>
        </div>
      </div>

      {/* Compound Interest Simulator Section */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-xl transition-colors ${
        isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Zap className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className={`font-extrabold text-lg ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
                Simulador de Independência Financeira (10 & 15 Anos)
              </h2>
              <p className={`text-xs ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
                Veja quanto seu dinheiro rende a longo prazo com aportes mensais consistentes.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className={isBlack ? 'text-zinc-300' : 'text-slate-700'}>Aporte Mensal na Caixinha:</span>
                <span className="text-emerald-500 font-extrabold text-sm">{formatCurrencyBRL(monthlyContribution)}</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>R$ 100/mês</span>
                <span>R$ 2.500/mês</span>
                <span>R$ 5.000/mês</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className={isBlack ? 'text-zinc-300' : 'text-slate-700'}>Rentabilidade Anual Estimada:</span>
                <span className="text-teal-500 font-extrabold text-sm">{annualRate}% a.a. (CDI/IPCA+)</span>
              </div>
              <input
                type="range"
                min="6"
                max="16"
                step="0.5"
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>6% a.a.</span>
                <span>11% a.a.</span>
                <span>16% a.a.</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isBlack ? 'bg-zinc-800/50 border-zinc-700/60 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            } text-xs space-y-2`}>
              <div className="font-bold flex items-center gap-1.5 text-emerald-500">
                <Sparkles className="w-4 h-4" />
                <span>Gatilho de Motivação</span>
              </div>
              <p>
                Guardar <strong className="text-emerald-500">{formatCurrencyBRL(monthlyContribution)}</strong> todos os meses equivale a deixar de gastar pequenas quantias diárias. Em 15 anos, você construirá um patrimônio que se sustenta sozinho!
              </p>
            </div>
          </div>

          {/* Projections Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 10 Years */}
            <div className={`rounded-3xl p-6 border shadow-lg relative overflow-hidden transition-all hover:scale-[1.01] ${
              isBlack ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Projeção em 10 Anos</span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  120 meses
                </span>
              </div>
              <div className="space-y-1 mb-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                  {formatCurrencyBRL(fv10Years)}
                </div>
                <div className={`text-xs ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Total acumulado com juros compostos
                </div>
              </div>
              <div className={`pt-3 border-t ${isBlack ? 'border-zinc-800' : 'border-slate-200'} flex items-center justify-between text-xs`}>
                <span className={isBlack ? 'text-zinc-400' : 'text-slate-600'}>Renda mensal estimada:</span>
                <span className="font-bold text-emerald-500">{formatCurrencyBRL(passiveIncome10)} /mês</span>
              </div>
            </div>

            {/* 15 Years */}
            <div className={`rounded-3xl p-6 border shadow-lg relative overflow-hidden transition-all hover:scale-[1.01] ${
              isBlack ? 'bg-gradient-to-br from-emerald-950/40 to-zinc-900 border-emerald-800/50' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 shadow-xs'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/15 rounded-full blur-2xl" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Projeção em 15 Anos</span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                  180 meses (Ouro)
                </span>
              </div>
              <div className="space-y-1 mb-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-teal-400 tracking-tight">
                  {formatCurrencyBRL(fv15Years)}
                </div>
                <div className={`text-xs ${isBlack ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Independência financeira garantida
                </div>
              </div>
              <div className={`pt-3 border-t ${isBlack ? 'border-zinc-800' : 'border-emerald-200'} flex items-center justify-between text-xs`}>
                <span className={isBlack ? 'text-zinc-400' : 'text-slate-600'}>Renda mensal estimada:</span>
                <span className="font-bold text-teal-400">{formatCurrencyBRL(passiveIncome15)} /mês</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Milestone Goals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`font-extrabold text-lg ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
              Caixinhas Fixas com Metas & Insígnias (Conquistas)
            </h2>
            <p className={`text-xs ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
              Conforme você atinge cada patamar, sua caixinha evolui de cor e desbloqueia novas conquistas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const isCompleted = progress >= 100;

            return (
              <div
                key={goal.id}
                className={`rounded-3xl p-6 border shadow-xl flex flex-col justify-between transition-all hover:scale-[1.01] ${
                  isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider bg-gradient-to-r ${goal.color} text-white shadow-sm`}>
                      {goal.badge}
                    </span>
                    {isCompleted ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" /> Concluído
                      </span>
                    ) : (
                      <span className={`text-xs font-bold ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {progress}%
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className={`font-extrabold text-base ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>{goal.name}</h3>
                    <p className={`text-xs mt-1 ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>{goal.description}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className={isBlack ? 'text-zinc-400' : 'text-slate-600'}>Guardado:</span>
                      <span className={isBlack ? 'text-zinc-100' : 'text-slate-900'}>
                        {formatCurrencyBRL(goal.currentAmount)} / <strong className="text-emerald-500">{formatCurrencyBRL(goal.targetAmount)}</strong>
                      </span>
                    </div>
                    <div className={`w-full rounded-full h-2.5 overflow-hidden ${isBlack ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${goal.color} transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className={`mt-5 pt-4 border-t ${isBlack ? 'border-zinc-800' : 'border-slate-100'} flex items-center justify-between`}>
                  <span className="text-[11px] text-slate-400">
                    {isCompleted ? 'Meta atingida com sucesso!' : `Faltam ${formatCurrencyBRL(goal.targetAmount - goal.currentAmount)}`}
                  </span>
                  <button
                    onClick={onOpenNewTransaction}
                    className="text-xs font-bold text-emerald-500 hover:underline flex items-center gap-1"
                  >
                    Depositar <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
