import React, { useState } from 'react';
import { Target, X, Check, DollarSign } from 'lucide-react';
import { BudgetGoal } from '../types';
import { CATEGORIES, getCategoryMeta, formatCurrencyBRL } from '../constants/categories';

interface BudgetGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetGoals: BudgetGoal[];
  onSaveGoals: (goals: BudgetGoal[]) => void;
}

export const BudgetGoalsModal: React.FC<BudgetGoalsModalProps> = ({
  isOpen,
  onClose,
  budgetGoals,
  onSaveGoals,
}) => {
  const [goals, setGoals] = useState<BudgetGoal[]>(budgetGoals);

  if (!isOpen) return null;

  const expenseCategories = CATEGORIES.filter((c) => c.type === 'DESPESA');

  const handleValueChange = (category: string, value: number) => {
    setGoals((prev) => {
      const existing = prev.find((g) => g.category === category);
      if (existing) {
        return prev.map((g) => (g.category === category ? { ...g, limit: value } : g));
      }
      return [...prev, { category, limit: value }];
    });
  };

  const handleSave = () => {
    onSaveGoals(goals);
    onClose();
  };

  const totalBudget = goals.reduce((acc, g) => acc + (g.limit || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-lg shadow-teal-950/50">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-zinc-100">Metas de Orçamento Mensal</h2>
              <p className="text-xs text-zinc-400">
                Defina o teto de gastos por categoria para o assistente te avisar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Planned */}
        <div className="p-4 bg-teal-950/50 border-b border-teal-900/60 flex items-center justify-between text-xs">
          <span className="font-semibold text-teal-300">Orçamento Total Planejado:</span>
          <span className="font-extrabold text-sm text-teal-200 font-mono">
            {formatCurrencyBRL(totalBudget)}
          </span>
        </div>

        {/* Goals List */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {expenseCategories.map((cat) => {
            const currentGoal = goals.find((g) => g.category === cat.name)?.limit || 0;
            return (
              <div key={cat.id} className="p-4 bg-zinc-800/80 rounded-2xl border border-zinc-700/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-200">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span>{cat.name}</span>
                  </div>
                  <span className="font-extrabold text-zinc-100 font-mono text-sm">
                    {formatCurrencyBRL(currentGoal)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={currentGoal}
                    onChange={(e) => handleValueChange(cat.name, parseFloat(e.target.value))}
                    className="flex-1 accent-teal-500 h-2 bg-zinc-700 rounded-lg cursor-pointer"
                  />
                  <div className="w-28 relative">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={currentGoal}
                      onChange={(e) => handleValueChange(cat.name, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-100 text-right focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="p-5 border-t border-zinc-800 flex items-center justify-end gap-3 bg-zinc-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 rounded-2xl border border-zinc-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-teal-950/50 transition-all"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Salvar Metas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
