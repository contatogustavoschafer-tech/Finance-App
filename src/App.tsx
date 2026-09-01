import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Mic,
  Receipt,
  Bot,
  Plus,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { FinancialOverview } from './components/FinancialOverview';
import { ChatAssistant } from './components/ChatAssistant';
import { TransactionList } from './components/TransactionList';
import { ExpenseCharts } from './components/ExpenseCharts';
import { TransactionModal } from './components/TransactionModal';
import { AudioInputModal } from './components/AudioInputModal';
import { ImageReceiptScanner } from './components/ImageReceiptScanner';
import { GoogleSheetsConnectModal } from './components/GoogleSheetsConnectModal';
import { BudgetGoalsModal } from './components/BudgetGoalsModal';
import { CaixinhasView } from './components/CaixinhasView';
import { LoginScreen } from './components/LoginScreen';
import { UserProfileDrawer } from './components/UserProfileDrawer';
import { MobileBottomNav } from './components/MobileBottomNav';
import {
  Transaction,
  SheetConfig,
  BudgetGoal,
  FinancialSummary,
  ParsedTransactionResult,
  AppUser,
} from './types';
import { INITIAL_TRANSACTIONS, INITIAL_BUDGET_GOALS } from './constants/initialData';
import {
  getStoredGoogleSession,
  appendTransactionToSheet,
  fetchTransactionsFromSheet,
  batchAppendTransactionsToSheet,
} from './services/sheetsService';
import {
  getStoredSession,
  clearSession,
  subscribeToUserTransactions,
  saveUserTransaction,
  deleteUserTransaction,
  subscribeToUserBudgetGoals,
  saveUserBudgetGoals,
} from './services/firebaseService';
import { formatCurrencyBRL, formatDateBR, getCategoryMeta } from './constants/categories';

const LOCAL_SHEET_CONFIG_KEY = 'fin_sheet_config_data';

export default function App() {
  // Authentication & Current User State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredSession());
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  // Theme Mode State ('black' OLED vs 'light')
  const [themeMode, setThemeMode] = useState<'black' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('fin_theme_mode');
      if (saved === 'light' || saved === 'black') return saved;
    } catch (e) {}
    return 'black';
  });

  useEffect(() => {
    localStorage.setItem('fin_theme_mode', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'black' ? 'light' : 'black'));
  };

  const isBlack = themeMode === 'black';

  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'transactions' | 'charts' | 'caixinhas'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);

  // Transactions State (Loaded per user from Firebase Firestore)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (currentUser?.id === 'gustavo') {
      try {
        const saved = localStorage.getItem(`tx_gustavo`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return INITIAL_TRANSACTIONS;
    }
    return [];
  });

  // Sheet Config State
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_SHEET_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      spreadsheetId: '',
      spreadsheetUrl: '',
      sheetName: 'Planilha Local',
      isConnected: false,
      autoSync: true,
    };
  });

  // Budget Goals State
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>(INITIAL_BUDGET_GOALS);

  // Modals Visibility State
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | ParsedTransactionResult | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // Syncing state & Toasts
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Subscribe to Firebase Firestore for the logged user
  useEffect(() => {
    if (!currentUser) return;

    // 1. Escuta em tempo real as transações do usuário ativo
    const unsubTx = subscribeToUserTransactions(currentUser.id, (list) => {
      setTransactions(list);
    });

    // 2. Escuta em tempo real as metas de orçamento do usuário ativo
    const unsubGoals = subscribeToUserBudgetGoals(currentUser.id, (goals) => {
      setBudgetGoals(goals);
    });

    return () => {
      unsubTx();
      unsubGoals();
    };
  }, [currentUser?.id]);

  // Persist sheet config
  useEffect(() => {
    localStorage.setItem(LOCAL_SHEET_CONFIG_KEY, JSON.stringify(sheetConfig));
  }, [sheetConfig]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setIsProfileDrawerOpen(false);
    showToast('Sessão encerrada com sucesso.', 'info');
  };

  // Compute Financial Summary
  const summary: FinancialSummary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const catMap = new Map<string, number>();

    transactions.forEach((t) => {
      if (t.type === 'RECEITA') {
        income += t.amount;
      } else {
        expenses += t.amount;
        catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
      }
    });

    const topCategories = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => {
        const meta = getCategoryMeta(category);
        return {
          category,
          amount,
          percentage: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
          color: meta.color,
        };
      });

    const balance = income - expenses;
    const savingsRate = income > 0 ? Math.max(0, Math.round((balance / income) * 100)) : 0;

    return {
      totalIncome: Number(income.toFixed(2)),
      totalExpenses: Number(expenses.toFixed(2)),
      balance: Number(balance.toFixed(2)),
      savingsRate,
      transactionCount: transactions.length,
      topCategories,
      recentActivity: transactions.slice(0, 5),
    };
  }, [transactions]);

  // Add / Save transaction from any source (Voice, Receipt, Chat, Manual)
  const handleSaveTransaction = async (
    txData: Partial<Transaction>,
    shouldSyncToSheets: boolean = true
  ) => {
    if (!currentUser) return;

    const isEdit = txData.id && transactions.some((t) => t.id === txData.id);

    let updatedTx: Transaction;
    let synced = false;

    if (isEdit) {
      updatedTx = {
        ...(transactions.find((t) => t.id === txData.id)!),
        ...txData,
        userId: currentUser.id,
      } as Transaction;

      // ✨ Atualização otimista — reflete imediatamente na UI sem esperar Firebase
      setTransactions((prev) =>
        prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
      );

      // Salva no Firebase
      await saveUserTransaction(currentUser.id, updatedTx);
      showToast(`Lançamento "${updatedTx.description}" atualizado!`);
    } else {
      const newId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      updatedTx = {
        id: newId,
        userId: currentUser.id,
        date: txData.date || new Date().toISOString().split('T')[0],
        description: txData.description || 'Novo Lançamento',
        amount: Number(txData.amount) || 0,
        type: txData.type || 'DESPESA',
        category: txData.category || 'Outros',
        paymentMethod: txData.paymentMethod || 'PIX',
        status: txData.status || 'Pago',
        notes: txData.notes || '',
        source: txData.source || 'manual',
        syncedToSheets: false,
        createdAt: new Date().toISOString(),
      };

      // ✨ Atualização otimista — adiciona imediatamente na lista local
      setTransactions((prev) => [updatedTx, ...prev]);

      // Tenta sincronização opcional com Google Sheets
      const session = getStoredGoogleSession();
      if (shouldSyncToSheets && sheetConfig.isConnected && sheetConfig.spreadsheetId && session?.accessToken) {
        try {
          await appendTransactionToSheet(session.accessToken, sheetConfig.spreadsheetId, updatedTx);
          updatedTx.syncedToSheets = true;
          synced = true;
          // Atualiza o status de sync na lista local também
          setTransactions((prev) =>
            prev.map((t) => (t.id === updatedTx.id ? { ...t, syncedToSheets: true } : t))
          );
        } catch (err) {
          console.warn('Could not auto-sync to Sheets on creation:', err);
        }
      }

      // Salva no Firebase em segundo plano
      await saveUserTransaction(currentUser.id, updatedTx);

      // Confetti celebration
      try {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch (e) {}

      showToast(
        synced
          ? `Lançado e salvo na nuvem: "${updatedTx.description}" (${formatCurrencyBRL(updatedTx.amount)})`
          : `Lançado com sucesso: "${updatedTx.description}" (${formatCurrencyBRL(updatedTx.amount)})`
      );
    }

    // Fecha o modal automaticamente após salvar
    setIsTransactionModalOpen(false);
  };

  // Add from AI parsed result
  const handleAddParsedTransaction = async (
    parsedTx: ParsedTransactionResult,
    source: 'audio' | 'image' | 'text'
  ) => {
    if (!currentUser) return;

    if (parsedTx.multipleTransactions && parsedTx.multipleTransactions.length > 0) {
      for (const item of parsedTx.multipleTransactions) {
        await handleSaveTransaction(
          {
            description: item.description,
            amount: item.amount,
            type: item.type || 'DESPESA',
            category: item.category || 'Outros',
            date: item.date || new Date().toISOString().split('T')[0],
            paymentMethod: item.paymentMethod || 'PIX',
            status: item.status || 'Pago',
            notes: item.notes || parsedTx.notes,
            source: source,
          },
          false
        );
      }

      try {
        confetti({
          particleCount: 40,
          spread: 70,
          origin: { y: 0.8 },
        });
      } catch (e) {}

      showToast(`${parsedTx.multipleTransactions.length} lançamentos processados pela IA com sucesso!`);
    } else {
      await handleSaveTransaction(
        {
          description: parsedTx.description,
          amount: parsedTx.amount,
          type: parsedTx.type,
          category: parsedTx.category,
          date: parsedTx.date,
          paymentMethod: parsedTx.paymentMethod,
          status: parsedTx.status,
          notes: parsedTx.notes,
          source: source,
        },
        sheetConfig.isConnected && sheetConfig.autoSync
      );
    }
  };

  // Delete transaction
  const handleDeleteTransaction = (id: string) => {
    const item = transactions.find((t) => t.id === id);
    if (!item) return;
    setTransactionToDelete(item);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete || !currentUser) return;
    await deleteUserTransaction(currentUser.id, transactionToDelete.id);
    showToast(`Lançamento "${transactionToDelete.description}" excluído.`);
    setTransactionToDelete(null);
  };

  // Clear all transactions
  const handleClearAllTransactions = () => {
    setIsClearAllModalOpen(true);
  };

  const confirmClearAllTransactions = async () => {
    if (!currentUser) return;
    for (const tx of transactions) {
      await deleteUserTransaction(currentUser.id, tx.id);
    }
    setTransactions([]);
    showToast('Todos os lançamentos foram limpos na nuvem!');
    setIsClearAllModalOpen(false);
  };

  // Sync with Google Sheets (Bi-directional check)
  const handleSyncWithSheets = async () => {
    if (!sheetConfig.isConnected || !sheetConfig.spreadsheetId) {
      setIsConnectModalOpen(true);
      return;
    }

    const session = getStoredGoogleSession();
    if (!session?.accessToken) {
      showToast('Sessão do Google expirada. Por favor reconecte.', 'error');
      setIsConnectModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const unsynced = transactions.filter((t) => !t.syncedToSheets);
      if (unsynced.length > 0) {
        await batchAppendTransactionsToSheet(session.accessToken, sheetConfig.spreadsheetId, unsynced);
        for (const t of unsynced) {
          if (currentUser) {
            await saveUserTransaction(currentUser.id, { ...t, syncedToSheets: true });
          }
        }
      }

      const sheetRows = await fetchTransactionsFromSheet(session.accessToken, sheetConfig.spreadsheetId);
      if (sheetRows && sheetRows.length > 0 && currentUser) {
        const existingIds = new Set(transactions.map((t) => t.id));
        const newFromSheet = sheetRows.filter((sr) => !existingIds.has(sr.id));
        for (const sr of newFromSheet) {
          await saveUserTransaction(currentUser.id, sr);
        }
      }

      setSheetConfig((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
      }));

      showToast('Google Sheets sincronizado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Sync error:', err);
      showToast(`Erro ao sincronizar: ${err.message || 'Falha de conexão'}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Se não estiver logado, exibe a tela de login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className={`min-h-screen overflow-x-hidden w-full max-w-full flex flex-col font-sans transition-colors ${
      isBlack
        ? 'bg-zinc-950 text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300'
        : 'bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900'
    }`}>
      {/* Top Navigation Bar */}
      <Navbar
        sheetConfig={sheetConfig}
        currentUser={currentUser}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onOpenNewTransaction={() => {
          setEditingTransaction(null);
          setIsTransactionModalOpen(true);
        }}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        onSyncWithSheets={handleSyncWithSheets}
        onOpenProfileDrawer={() => setIsProfileDrawerOpen(true)}
        isSyncing={isSyncing}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area (padding-bottom responsivo para a barra móvel inferior) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-24 md:pb-8 space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed top-20 right-4 sm:right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-slideUp transition-all ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border border-emerald-700 shadow-emerald-950/80'
                : toastMessage.type === 'error'
                ? 'bg-rose-950 text-rose-100 border border-rose-700 shadow-rose-950/80'
                : 'bg-zinc-900 text-zinc-100 border border-zinc-700 shadow-black/80'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* TAB 1: Visão Geral (Dashboard) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <FinancialOverview
              summary={summary}
              selectedMonth={selectedMonth}
              onChangeMonth={setSelectedMonth}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
              onOpenChat={(prompt) => {
                setChatInitialPrompt(prompt);
                setActiveTab('chat');
              }}
              onOpenNewTransaction={() => {
                setEditingTransaction(null);
                setIsTransactionModalOpen(true);
              }}
              themeMode={themeMode}
            />

            {/* Layout 2 Colunas: Chat IA + Lançamentos Recentes */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Interactive Chat Assistant */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className={`font-bold text-sm ${isBlack ? 'text-zinc-200' : 'text-slate-800'}`}>
                      Conversar & Lançar com IA
                    </h2>
                  </div>
                  <span className={`text-xs ${isBlack ? 'text-zinc-500' : 'text-slate-500'}`}>
                    Grave áudio ou anexe fotos de notas
                  </span>
                </div>
                <ChatAssistant
                  transactions={transactions}
                  summary={summary}
                  budgetGoals={budgetGoals}
                  sheetConfig={sheetConfig}
                  onAddTransaction={handleAddParsedTransaction}
                  onOpenEditModal={(tx) => {
                    setEditingTransaction(tx);
                    setIsTransactionModalOpen(true);
                  }}
                  initialPrompt={chatInitialPrompt}
                  onClearInitialPrompt={() => setChatInitialPrompt(undefined)}
                  themeMode={themeMode}
                />
              </div>

              {/* Right Column: Mini Stream & Top Categories */}
              <div className="lg:col-span-5 space-y-6">
                {/* Recent Entries Card */}
                <div className={`rounded-3xl p-5 sm:p-6 border shadow-xl space-y-4 transition-colors ${
                  isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-extrabold text-sm ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>Últimos Lançamentos</h3>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-xs font-semibold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Ver todos ({transactions.length}) <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className={`divide-y ${isBlack ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                    {transactions.slice(0, 5).map((tx) => {
                      const isIncome = tx.type === 'RECEITA';

                      return (
                        <div key={tx.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                                isIncome 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : isBlack ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isIncome ? (
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-rose-400" />
                              )}
                            </div>
                            <div className="truncate">
                              <span className={`font-bold text-xs block truncate ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
                                {tx.description}
                              </span>
                              <span className={`text-[11px] ${isBlack ? 'text-zinc-400' : 'text-slate-400'}`}>
                                {formatDateBR(tx.date)} • {tx.category}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`font-extrabold text-xs block ${
                                isIncome ? 'text-emerald-400' : isBlack ? 'text-zinc-100' : 'text-slate-900'
                              }`}
                            >
                              {isIncome ? '+' : '-'} {formatCurrencyBRL(tx.amount)}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Firebase
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setEditingTransaction(null);
                      setIsTransactionModalOpen(true);
                    }}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      isBlack
                        ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lançar Nova Despesa ou Receita</span>
                  </button>
                </div>

                {/* Top Spending Categories Widget */}
                <div className={`rounded-3xl p-5 sm:p-6 border shadow-xl space-y-3 transition-colors ${
                  isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-extrabold text-sm ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>Maiores Categorias</h3>
                    <button
                      onClick={() => setActiveTab('charts')}
                      className="text-xs font-semibold text-emerald-500 hover:underline cursor-pointer"
                    >
                      Gráficos detalhados
                    </button>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {summary.topCategories.length > 0 ? (
                      summary.topCategories.map((cat) => (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-medium ${isBlack ? 'text-zinc-300' : 'text-slate-700'}`}>{cat.category}</span>
                            <span className={`font-bold ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>{formatCurrencyBRL(cat.amount)} ({cat.percentage}%)</span>
                          </div>
                          <div className={`w-full rounded-full h-1.5 overflow-hidden ${isBlack ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className={`text-xs ${isBlack ? 'text-zinc-400' : 'text-slate-400'}`}>Nenhuma despesa registrada.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Chat IA */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-lg sm:text-xl font-extrabold tracking-tight ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
                  Assistente Financeiro IA
                </h1>
                <p className={`text-xs ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Consulte seus gastos, tire dúvidas financeiras ou lance transações por voz e foto
                </p>
              </div>
            </div>
            <ChatAssistant
              transactions={transactions}
              summary={summary}
              budgetGoals={budgetGoals}
              sheetConfig={sheetConfig}
              onAddTransaction={handleAddParsedTransaction}
              onOpenEditModal={(tx) => {
                setEditingTransaction(tx);
                setIsTransactionModalOpen(true);
              }}
              initialPrompt={chatInitialPrompt}
              onClearInitialPrompt={() => setChatInitialPrompt(undefined)}
              themeMode={themeMode}
            />
          </div>
        )}

        {/* TAB 3: Extrato & Lançamentos */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className={`text-lg sm:text-xl font-extrabold tracking-tight ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
                  Extrato e Controle de Lançamentos
                </h1>
                <p className={`text-xs ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Lançamentos pessoais sincronizados em tempo real no Firebase
                </p>
              </div>
            </div>

            <TransactionList
              transactions={transactions}
              sheetConfig={sheetConfig}
              onEditTransaction={(tx) => {
                setEditingTransaction(tx);
                setIsTransactionModalOpen(true);
              }}
              onDeleteTransaction={handleDeleteTransaction}
              onClearAllTransactions={handleClearAllTransactions}
              onOpenNewModal={() => {
                setEditingTransaction(null);
                setIsTransactionModalOpen(true);
              }}
              onSyncAllWithSheets={handleSyncWithSheets}
              isSyncing={isSyncing}
              themeMode={themeMode}
            />
          </div>
        )}

        {/* TAB 4: Gráficos & Relatórios */}
        {activeTab === 'charts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-lg sm:text-xl font-extrabold tracking-tight ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
                  Relatórios Visuais & Orçamento
                </h1>
                <p className={`text-xs ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Análise de categorias, evolução mensal e metas de gastos
                </p>
              </div>
            </div>

            <ExpenseCharts
              transactions={transactions}
              budgetGoals={budgetGoals}
              summary={summary}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
              themeMode={themeMode}
            />
          </div>
        )}

        {/* TAB 5: Caixinhas & Metas */}
        {activeTab === 'caixinhas' && (
          <CaixinhasView
            transactions={transactions}
            themeMode={themeMode}
            onOpenNewTransaction={() => {
              setEditingTransaction(null);
              setIsTransactionModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Barra de Navegação Inferior para Celulares (Mobile Bottom Nav) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTransaction={() => {
          setEditingTransaction(null);
          setIsTransactionModalOpen(true);
        }}
        themeMode={themeMode}
      />

      {/* Drawer de Perfil / Logout / Troca de Senha */}
      <UserProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
      />

      {/* Global Modals */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
        sheetConnected={sheetConfig.isConnected}
      />

      <AudioInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onConfirmTransaction={handleAddParsedTransaction}
        sheetConnected={sheetConfig.isConnected}
      />

      <ImageReceiptScanner
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onConfirmTransaction={handleAddParsedTransaction}
        sheetConnected={sheetConfig.isConnected}
      />

      <GoogleSheetsConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        sheetConfig={sheetConfig}
        onUpdateSheetConfig={(cfg) => setSheetConfig(cfg)}
        transactions={transactions}
        onImportTransactions={async (imported) => {
          if (currentUser) {
            for (const item of imported) {
              await saveUserTransaction(currentUser.id, item);
            }
          }
          showToast(`${imported.length} lançamentos importados e sincronizados!`);
        }}
      />

      <BudgetGoalsModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        budgetGoals={budgetGoals}
        onSaveGoals={async (goals) => {
          if (currentUser) {
            await saveUserBudgetGoals(currentUser.id, goals);
          }
          setBudgetGoals(goals);
          showToast('Metas de orçamento atualizadas com sucesso!');
        }}
      />

      {/* Delete Single Transaction Modal */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-800 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Excluir Lançamento</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Tem certeza que deseja excluir o lançamento <strong className="text-zinc-200">"{transactionToDelete.description}"</strong> de <span className="font-semibold text-emerald-400">{formatCurrencyBRL(transactionToDelete.amount)}</span>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTransactionToDelete(null)}
                className="px-4 py-2.5 text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteTransaction}
                className="px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Transactions Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-800 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Começar do Zero</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Tem certeza que deseja apagar <strong className="text-zinc-200">todos os seus lançamentos</strong>? Esta ação removerá os registros da sua conta na nuvem.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClearAllTransactions}
                className="px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                Apagar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
