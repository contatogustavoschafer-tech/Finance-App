import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Mic,
  Receipt,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { FinancialSummary, Transaction } from '../types';
import { formatCurrencyBRL } from '../constants/categories';

interface FinancialOverviewProps {
  summary: FinancialSummary;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  onOpenVoiceModal: () => void;
  onOpenReceiptModal: () => void;
  onOpenChat: (initialPrompt?: string) => void;
  onOpenNewTransaction: () => void;
  themeMode?: 'black' | 'light';
}

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({
  summary,
  selectedMonth,
  onChangeMonth,
  onOpenVoiceModal,
  onOpenReceiptModal,
  onOpenChat,
  onOpenNewTransaction,
  themeMode = 'black',
}) => {
  const isBlack = themeMode === 'black';
  const isPositiveBalance = summary.balance >= 0;
  const savingsPercent = summary.totalIncome > 0
    ? Math.max(0, Math.round((summary.balance / summary.totalIncome) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner with AI Assistant Quick Action */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-xl relative overflow-hidden transition-colors ${
        isBlack
          ? 'bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 text-zinc-100 border-zinc-800'
          : 'bg-white text-slate-900 border-slate-200 shadow-sm'
      }`}>
        {/* Subtle background glow */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isBlack ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Agente Financeiro Inteligente</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
              Controle Financeiro & IA
            </h1>
            <p className={`text-sm max-w-xl ${isBlack ? 'text-zinc-400' : 'text-slate-600'}`}>
              Fale por áudio, escaneie notas fiscais ou converse com o assistente para organizar seus gastos e sincronizar tudo com o Google Sheets.
            </p>
          </div>

          {/* Quick Input Bar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-banner-audio"
              onClick={onOpenVoiceModal}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 px-4 rounded-2xl shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mic className="w-4 h-4" />
              <span>Falar por Áudio</span>
            </button>
            <button
              id="btn-banner-receipt"
              onClick={onOpenReceiptModal}
              className={`flex items-center gap-2 text-xs font-bold py-3 px-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isBlack ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span>Foto de Nota / Cupom</span>
            </button>
            <button
              id="btn-banner-chat"
              onClick={() => onOpenChat('Quanto gastei este mês e qual é o meu saldo?')}
              className={`flex items-center gap-2 text-xs font-bold py-3 px-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isBlack ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <Bot className="w-4 h-4 text-teal-500" />
              <span>Consultar Gastos</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income Card */}
        <div className={`rounded-3xl p-6 border shadow-xl flex flex-col justify-between transition-all ${
          isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
              Receitas do Mês
            </span>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isBlack ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
              {formatCurrencyBRL(summary.totalIncome)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span>Entradas registradas</span>
            </div>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className={`rounded-3xl p-6 border shadow-xl flex flex-col justify-between transition-all ${
          isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
              Despesas do Mês
            </span>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isBlack ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
              {formatCurrencyBRL(summary.totalExpenses)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-500 font-medium">
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
              <span>Total de saídas no período</span>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className={`rounded-3xl p-6 border shadow-xl flex flex-col justify-between transition-all ${
          isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
              Saldo Líquido
            </span>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isPositiveBalance 
                ? isBlack ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isBlack ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              isPositiveBalance 
                ? isBlack ? 'text-emerald-400' : 'text-emerald-700' 
                : isBlack ? 'text-rose-400' : 'text-rose-700'
            }`}>
              {formatCurrencyBRL(summary.balance)}
            </div>
            <div className={`mt-1 text-xs font-medium ${isBlack ? 'text-zinc-400' : 'text-slate-600'}`}>
              {isPositiveBalance ? 'Superávit no período' : 'Atenção: despesas altas'}
            </div>
          </div>
        </div>

        {/* Savings / Goals Card */}
        <div className={`rounded-3xl p-6 border shadow-xl flex flex-col justify-between transition-all ${
          isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
              Taxa de Poupança
            </span>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
              isBlack ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}>
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
                {savingsPercent}%
              </span>
              <span className={`text-xs ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>da renda poupada</span>
            </div>
            <div className={`mt-3 w-full rounded-full h-2 overflow-hidden ${isBlack ? 'bg-zinc-800' : 'bg-slate-100'}`}>
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, savingsPercent))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
