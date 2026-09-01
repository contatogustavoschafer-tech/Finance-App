import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit2,
  Mic,
  Receipt,
  MessageSquare,
  PenTool,
  CheckCircle2,
  Clock,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  Tag,
  Plus,
  Calendar,
} from 'lucide-react';
import { Transaction, ExpenseFilter, SheetConfig } from '../types';
import { CATEGORIES, formatCurrencyBRL, formatDateBR, getCategoryMeta } from '../constants/categories';

interface TransactionListProps {
  transactions: Transaction[];
  sheetConfig: SheetConfig;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onClearAllTransactions: () => void;
  onOpenNewModal: () => void;
  onSyncAllWithSheets: () => void;
  isSyncing: boolean;
  themeMode?: 'black' | 'light';
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  sheetConfig,
  onEditTransaction,
  onDeleteTransaction,
  onClearAllTransactions,
  onOpenNewModal,
  onSyncAllWithSheets,
  isSyncing,
  themeMode = 'black',
}) => {
  const isBlack = themeMode === 'black';

  const [filters, setFilters] = useState<ExpenseFilter>({
    type: 'ALL',
    category: 'ALL',
    month: 'ALL',
    search: '',
    paymentMethod: 'ALL',
    syncedOnly: false,
  });

  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Meses disponíveis únicos ordenados do mais recente ao mais antigo
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Transações Filtradas e Ordenadas
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filters.type !== 'ALL' && t.type !== filters.type) return false;
      if (filters.category !== 'ALL' && t.category !== filters.category) return false;
      if (filters.paymentMethod !== 'ALL' && t.paymentMethod !== filters.paymentMethod) return false;
      if (filters.month !== 'ALL' && !t.date.startsWith(filters.month)) return false;
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const matchesDesc = t.description.toLowerCase().includes(query);
        const matchesCat = t.category.toLowerCase().includes(query);
        const matchesNotes = (t.notes || '').toLowerCase().includes(query);
        const matchesAmount = t.amount.toString().includes(query);
        if (!matchesDesc && !matchesCat && !matchesNotes && !matchesAmount) return false;
      }
      if (filters.syncedOnly && !t.syncedToSheets) return false;
      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortField === 'date') {
        comp = new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortField === 'amount') {
        comp = b.amount - a.amount;
      } else if (sortField === 'description') {
        comp = a.description.localeCompare(b.description);
      }
      return sortDirection === 'asc' ? -comp : comp;
    });
  }, [transactions, filters, sortField, sortDirection]);

  // Exportar para CSV
  const handleExportCSV = () => {
    const headers = ['ID,Data,Tipo,Categoria,Descrição,Valor,Pagamento,Status,Origem,Observações'];
    const rows = filteredTransactions.map((t) =>
      `"${t.id}","${t.date}","${t.type}","${t.category}","${t.description.replace(/"/g, '""')}","${t.amount}","${t.paymentMethod}","${t.status}","${t.source}","${(t.notes || '').replace(/"/g, '""')}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finance_ia_extrato_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'audio':
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            isBlack ? 'text-purple-300 bg-purple-950/60 border-purple-800/80' : 'text-purple-800 bg-purple-50 border-purple-200'
          }`}>
            <Mic className="w-3 h-3 text-purple-400" /> Áudio
          </span>
        );
      case 'image':
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            isBlack ? 'text-cyan-300 bg-cyan-950/60 border-cyan-800/80' : 'text-cyan-800 bg-cyan-50 border-cyan-200'
          }`}>
            <Receipt className="w-3 h-3 text-cyan-400" /> Nota Fiscal
          </span>
        );
      case 'text':
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            isBlack ? 'text-teal-300 bg-teal-950/60 border-teal-800/80' : 'text-teal-800 bg-teal-50 border-teal-200'
          }`}>
            <MessageSquare className="w-3 h-3 text-teal-400" /> IA Chat
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
            isBlack ? 'text-zinc-400 bg-zinc-800/80 border-zinc-700' : 'text-slate-600 bg-slate-100 border-slate-200'
          }`}>
            <PenTool className="w-3 h-3" /> Manual
          </span>
        );
    }
  };

  const formatMonthName = (m: string) => {
    if (!m || m === 'ALL') return 'Todos os Meses';
    const [year, month] = m.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    return `${months[monthIdx] || month} ${year}`;
  };

  return (
    <div className="space-y-4">
      {/* Abas Rápidas de Navegação por Mês */}
      {availableMonths.length > 0 && (
        <div className={`p-2 rounded-2xl border flex items-center gap-2 overflow-x-auto no-scrollbar ${
          isBlack ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 text-emerald-400 shrink-0">
            <Calendar className="w-4 h-4" />
            <span>Mês:</span>
          </div>
          <button
            onClick={() => setFilters({ ...filters, month: 'ALL' })}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
              filters.month === 'ALL'
                ? isBlack ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-xs'
                : isBlack ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos ({transactions.length})
          </button>
          {availableMonths.map((m) => {
            const count = transactions.filter((t) => t.date && t.date.startsWith(m)).length;
            const isSelected = filters.month === m;
            return (
              <button
                key={m}
                onClick={() => setFilters({ ...filters, month: m })}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                  isSelected
                    ? isBlack ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-600 text-white shadow-xs'
                    : isBlack ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {formatMonthName(m)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Header de Busca e Filtros */}
      <div className={`rounded-3xl p-4 sm:p-6 border shadow-xl space-y-4 transition-colors ${
        isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isBlack ? 'text-zinc-400' : 'text-slate-400'}`} />
            <input
              id="search-transactions"
              type="text"
              placeholder="Buscar por descrição, categoria, valor..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className={`w-full pl-9 pr-4 py-2.5 rounded-2xl text-xs sm:text-sm transition-colors outline-none focus:ring-2 focus:ring-emerald-500 ${
                isBlack
                  ? 'bg-zinc-800/90 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                  : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          {/* Ações Rápidas */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              title="Baixar lista em CSV"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                isBlack
                  ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border-zinc-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 shadow-xs'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              id="btn-clear-all"
              onClick={onClearAllTransactions}
              title="Apagar todos os lançamentos e ir do zero"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                isBlack
                  ? 'bg-rose-950/50 text-rose-300 hover:bg-rose-900/70 border-rose-800/60'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Zerar</span>
            </button>

            <button
              id="btn-new-tx-table"
              onClick={onOpenNewModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo</span>
            </button>
          </div>
        </div>

        {/* Filtros em Linha (Tipo, Categoria) */}
        <div className={`flex flex-wrap items-center gap-2.5 pt-3 border-t text-xs ${isBlack ? 'border-zinc-800' : 'border-slate-200'}`}>
          {/* Filtro por Tipo */}
          <div className={`flex items-center p-1 rounded-xl border ${
            isBlack ? 'bg-zinc-800/90 border-zinc-700/80' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setFilters({ ...filters, type: 'ALL' })}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filters.type === 'ALL'
                  ? isBlack ? 'bg-zinc-700 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                  : isBlack ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilters({ ...filters, type: 'DESPESA' })}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filters.type === 'DESPESA'
                  ? isBlack ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-xs' : 'bg-white text-rose-600 shadow-xs'
                  : isBlack ? 'text-zinc-400 hover:text-rose-400' : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => setFilters({ ...filters, type: 'RECEITA' })}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filters.type === 'RECEITA'
                  ? isBlack ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-xs' : 'bg-white text-emerald-700 shadow-xs'
                  : isBlack ? 'text-zinc-400 hover:text-emerald-400' : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              Receitas
            </button>
          </div>

          {/* Dropdown de Categorias */}
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className={`px-3 py-1.5 rounded-xl font-semibold text-xs border outline-none cursor-pointer ${
              isBlack
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">Todas as Categorias</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Contador de Lançamentos */}
          <span className={`ml-auto text-xs font-semibold ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>
      </div>

      {/* Lista de Transações */}
      {filteredTransactions.length === 0 ? (
        <div className={`rounded-3xl p-12 text-center border space-y-3 transition-colors ${
          isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
            isBlack ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            <Search className="w-6 h-6" />
          </div>
          <h3 className={`font-bold text-base ${isBlack ? 'text-white' : 'text-slate-900'}`}>
            Nenhum lançamento encontrado
          </h3>
          <p className={`text-xs max-w-sm mx-auto ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
            Não há registros para os filtros selecionados. Comece gravando um áudio ou criando um lançamento!
          </p>
          <button
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Lançamento</span>
          </button>
        </div>
      ) : (
        <div className={`rounded-3xl border shadow-xl overflow-hidden transition-colors ${
          isBlack ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className={`border-b font-extrabold uppercase tracking-wider text-[10px] sm:text-xs ${
                isBlack ? 'bg-zinc-800/80 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">Data & Descrição</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Nuvem</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isBlack ? 'divide-zinc-800' : 'divide-slate-200'}`}>
                {filteredTransactions.map((tx) => {
                  const catMeta = getCategoryMeta(tx.category);
                  const isIncome = tx.type === 'RECEITA';

                  return (
                    <tr
                      key={tx.id}
                      className={`transition-colors group ${
                        isBlack ? 'hover:bg-zinc-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Descrição & Data com ALTO CONTRASTE */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isIncome
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isBlack ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isIncome ? (
                              <TrendingUp className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-rose-400" />
                            )}
                          </div>
                          <div>
                            <span className={`font-bold text-xs sm:text-sm block leading-tight ${
                              isBlack ? 'text-white' : 'text-slate-900'
                            }`}>
                              {tx.description}
                            </span>
                            <span className={`text-[11px] font-medium ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
                              {formatDateBR(tx.date)}
                              {tx.notes && <span className={isBlack ? 'text-zinc-400 ml-1' : 'text-slate-600 ml-1'}>• {tx.notes}</span>}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${catMeta.bgColor} ${catMeta.textColor}`}
                        >
                          <Tag className="w-3 h-3" />
                          {tx.category}
                        </span>
                      </td>

                      {/* Método de Pagamento */}
                      <td className={`py-3.5 px-4 whitespace-nowrap font-medium ${isBlack ? 'text-zinc-300' : 'text-slate-700'}`}>
                        {tx.paymentMethod}
                      </td>

                      {/* Origem */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getSourceBadge(tx.source)}
                      </td>

                      {/* Valor em Alto Contraste */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-extrabold text-sm sm:text-base">
                        <span className={isIncome ? 'text-emerald-400 font-bold' : isBlack ? 'text-white' : 'text-slate-900'}>
                          {isIncome ? '+ ' : '- '}
                          {formatCurrencyBRL(tx.amount)}
                        </span>
                      </td>

                      {/* Status Nuvem */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            isBlack
                              ? 'text-emerald-300 bg-emerald-950/60 border-emerald-800/80'
                              : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Firebase ✓
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            id={`btn-edit-${tx.id}`}
                            onClick={() => onEditTransaction(tx)}
                            title="Editar lançamento"
                            className={`p-1.5 rounded-lg transition-colors ${
                              isBlack ? 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-100'
                            }`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-${tx.id}`}
                            onClick={() => onDeleteTransaction(tx.id)}
                            title="Excluir lançamento"
                            className={`p-1.5 rounded-lg transition-colors ${
                              isBlack ? 'text-zinc-500 hover:text-rose-400 hover:bg-zinc-800' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
