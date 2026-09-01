import React, { useMemo, useState, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Sector,
} from 'recharts';
import {
  PieChart as PieIcon,
  BarChart3,
  Target,
  Sliders,
} from 'lucide-react';
import { Transaction, BudgetGoal, FinancialSummary } from '../types';
import { formatCurrencyBRL, getCategoryMeta } from '../constants/categories';

interface ExpenseChartsProps {
  transactions: Transaction[];
  budgetGoals: BudgetGoal[];
  summary: FinancialSummary;
  onOpenBudgetModal: () => void;
  themeMode?: 'black' | 'light';
}

// Active shape animado para o Pie Chart
const renderActiveShape = (props: any, isBlack: boolean) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value,
  } = props;

  return (
    <g>
      {/* Anel externo pulsando */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.15}
      />
      {/* Fatia principal expandida */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      {/* Texto central */}
      <text x={cx} y={cy - 10} textAnchor="middle" fill={isBlack ? '#fff' : '#0f172a'} fontSize={13} fontWeight="bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={fill} fontSize={14} fontWeight="800">
        {formatCurrencyBRL(value)}
      </text>
      <text x={cx} y={cy + 28} textAnchor="middle" fill={isBlack ? '#a1a1aa' : '#64748b'} fontSize={11}>
        {(percent * 100).toFixed(0)}% do total
      </text>
    </g>
  );
};

export const ExpenseCharts: React.FC<ExpenseChartsProps> = ({
  transactions,
  budgetGoals,
  summary,
  onOpenBudgetModal,
  themeMode = 'black',
}) => {
  const isBlack = themeMode === 'black';
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActivePieIndex(index);
  }, []);
  const onPieLeave = useCallback(() => {
    setActivePieIndex(null);
  }, []);

  // Category breakdown for Pie Chart
  const categoryData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'DESPESA');
    const totalExp = expenses.reduce((acc, t) => acc + t.amount, 0);

    const map = new Map<string, number>();
    expenses.forEach((t) => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });

    const result: Array<{ name: string; value: number; percentage: number; color: string }> = [];
    map.forEach((amount, catName) => {
      const meta = getCategoryMeta(catName);
      result.push({
        name: catName,
        value: Number(amount.toFixed(2)),
        percentage: totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0,
        color: meta.color,
      });
    });

    return result.sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Cash flow by month for Bar Chart
  const monthlyFlowData = useMemo(() => {
    const monthMap = new Map<string, { income: number; expense: number }>();

    transactions.forEach((t) => {
      const monthKey = t.date ? t.date.substring(0, 7) : '2026-09';
      const current = monthMap.get(monthKey) || { income: 0, expense: 0 };
      if (t.type === 'RECEITA') {
        current.income += t.amount;
      } else {
        current.expense += t.amount;
      }
      monthMap.set(monthKey, current);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: month,
        Receitas: Number(data.income.toFixed(2)),
        Despesas: Number(data.expense.toFixed(2)),
      }));
  }, [transactions]);

  // Budget Goals comparison
  const budgetComparison = useMemo(() => {
    const expensesByCategory = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'DESPESA')
      .forEach((t) => {
        expensesByCategory.set(t.category, (expensesByCategory.get(t.category) || 0) + t.amount);
      });

    return budgetGoals.map((bg) => {
      const spent = expensesByCategory.get(bg.category) || 0;
      const percent = bg.limit > 0 ? Math.round((spent / bg.limit) * 100) : 0;
      return {
        category: bg.category,
        limit: bg.limit,
        spent,
        percent,
        isOver: spent > bg.limit,
      };
    });
  }, [transactions, budgetGoals]);

  const BarTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-xl shadow-xl text-xs space-y-1.5 border ${
          isBlack ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <p className={`font-bold mb-1 ${isBlack ? 'text-zinc-300' : 'text-slate-500'}`}>{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="font-semibold">{entry.dataKey}:</span>
              <span className="font-extrabold">{formatCurrencyBRL(Number(entry.value))}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* === Pie Chart: Despesas por Categoria === */}
        <div className={`rounded-3xl p-5 sm:p-6 border shadow-xl space-y-4 transition-colors ${
          isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-sm ${isBlack ? 'text-white' : 'text-slate-900'}`}>
                Despesas por Categoria
              </h3>
              <p className={`text-[11px] ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
                Passe o mouse para ver o detalhe
              </p>
            </div>
          </div>

          {categoryData.length > 0 ? (
            <div className="h-64 sm:h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                    activeShape={(props: any) => renderActiveShape(props, isBlack)}
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={activePieIndex === null || activePieIndex === index ? 1 : 0.45}
                        style={{ transition: 'opacity 0.2s' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className={`p-3 rounded-xl shadow-xl text-xs space-y-1 border ${
                            isBlack ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                          }`}>
                            <p className="font-bold flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                              {d.name}
                            </p>
                            <p className="font-extrabold text-sm">{formatCurrencyBRL(d.value)}</p>
                            <p className={isBlack ? 'text-zinc-400' : 'text-slate-500'}>{d.percentage}% do total</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`h-64 flex flex-col items-center justify-center gap-3 text-xs ${isBlack ? 'text-zinc-500' : 'text-slate-400'}`}>
              <PieIcon className="w-10 h-10 opacity-20" />
              <span>Nenhuma despesa registrada ainda</span>
            </div>
          )}

          {/* Category Badges */}
          <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t ${isBlack ? 'border-zinc-800' : 'border-slate-200'}`}>
            {categoryData.slice(0, 6).map((cat, idx) => (
              <div
                key={cat.name}
                onMouseEnter={() => setActivePieIndex(idx)}
                onMouseLeave={() => setActivePieIndex(null)}
                style={{ transform: activePieIndex === idx ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.15s ease' }}
                className={`flex items-center gap-2 text-xs p-2 rounded-xl border cursor-pointer ${
                  isBlack
                    ? activePieIndex === idx ? 'bg-zinc-700/80 border-zinc-600' : 'bg-zinc-800/60 border-zinc-800'
                    : activePieIndex === idx ? 'bg-slate-100 border-slate-300 shadow-sm' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className={`truncate font-medium ${isBlack ? 'text-zinc-300' : 'text-slate-700'}`}>{cat.name}</span>
                <span className={`ml-auto font-bold ${isBlack ? 'text-white' : 'text-slate-900'}`}>{cat.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* === Bar Chart: Fluxo de Caixa === */}
        <div className={`rounded-3xl p-5 sm:p-6 border shadow-xl space-y-4 transition-colors ${
          isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-sm ${isBlack ? 'text-white' : 'text-slate-900'}`}>
                Fluxo de Caixa (Entradas vs Saídas)
              </h3>
              <p className={`text-[11px] ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>Comparativo financeiro mensal</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isBlack ? '#27272a' : '#f1f5f9'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isBlack ? '#a1a1aa' : '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: isBlack ? '#a1a1aa' : '#64748b' }} />
                <Tooltip content={<BarTooltipContent />} cursor={{ fill: isBlack ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', radius: 8 }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                <Bar
                  dataKey="Receitas"
                  fill="#10b981"
                  radius={[7, 7, 0, 0]}
                  maxBarSize={60}
                  activeBar={{ fill: '#34d399', radius: [7, 7, 0, 0] }}
                />
                <Bar
                  dataKey="Despesas"
                  fill="#f43f5e"
                  radius={[7, 7, 0, 0]}
                  maxBarSize={60}
                  activeBar={{ fill: '#fb7185', radius: [7, 7, 0, 0] }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* === Budget Goals Tracker === */}
      <div className={`rounded-3xl p-5 sm:p-6 border shadow-xl space-y-4 transition-colors ${
        isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-extrabold text-sm ${isBlack ? 'text-white' : 'text-slate-900'}`}>
                Metas &amp; Limites de Gastos por Categoria
              </h3>
              <p className={`text-[11px] ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>Acompanhe seu teto orçamentário mensal</p>
            </div>
          </div>

          <button
            id="btn-edit-budget-goals"
            onClick={onOpenBudgetModal}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              isBlack
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-xs'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configurar Metas</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {budgetComparison.map((goal) => {
            const catMeta = getCategoryMeta(goal.category);
            return (
              <div
                key={goal.category}
                className={`p-4 rounded-2xl border space-y-2.5 transition-all duration-200 hover:scale-[1.025] hover:shadow-lg ${
                  goal.isOver
                    ? isBlack ? 'bg-rose-950/30 border-rose-800/80 hover:border-rose-600' : 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
                    : isBlack ? 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-600' : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold flex items-center gap-1.5 ${isBlack ? 'text-white' : 'text-slate-900'}`}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catMeta.color }} />
                    {goal.category}
                  </span>
                  <span
                    className={`font-extrabold text-[11px] px-2 py-0.5 rounded-full ${
                      goal.isOver
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {goal.percent}%
                  </span>
                </div>

                <div className={`w-full rounded-full h-2 overflow-hidden ${isBlack ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${goal.isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, goal.percent)}%` }}
                  />
                </div>

                <div className={`flex items-center justify-between text-[11px] font-semibold ${
                  isBlack ? 'text-zinc-400' : 'text-slate-500'
                }`}>
                  <span>Gasto: <strong className={isBlack ? 'text-white' : 'text-slate-900'}>{formatCurrencyBRL(goal.spent)}</strong></span>
                  <span>Teto: {formatCurrencyBRL(goal.limit)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
