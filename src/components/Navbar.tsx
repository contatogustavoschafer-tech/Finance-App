import React from 'react';
import {
  FileSpreadsheet,
  Mic,
  Plus,
  Receipt,
  RefreshCw,
  ExternalLink,
  Bot,
  SlidersHorizontal,
  CheckCircle2,
  Sun,
  Moon,
  PiggyBank,
  User,
  Sparkles,
} from 'lucide-react';
import { SheetConfig, AppUser } from '../types';

interface NavbarProps {
  sheetConfig: SheetConfig;
  currentUser: AppUser;
  onOpenConnectModal: () => void;
  onOpenNewTransaction: () => void;
  onOpenVoiceModal: () => void;
  onOpenReceiptModal: () => void;
  onOpenBudgetModal: () => void;
  onSyncWithSheets: () => void;
  onOpenProfileDrawer: () => void;
  isSyncing: boolean;
  activeTab: 'dashboard' | 'chat' | 'transactions' | 'charts' | 'caixinhas';
  setActiveTab: (tab: 'dashboard' | 'chat' | 'transactions' | 'charts' | 'caixinhas') => void;
  themeMode: 'black' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sheetConfig,
  currentUser,
  onOpenConnectModal,
  onOpenNewTransaction,
  onOpenVoiceModal,
  onOpenReceiptModal,
  onOpenBudgetModal,
  onSyncWithSheets,
  onOpenProfileDrawer,
  isSyncing,
  activeTab,
  setActiveTab,
  themeMode,
  onToggleTheme,
}) => {
  const isBlack = themeMode === 'black';

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${
      isBlack 
        ? 'bg-zinc-950/90 border-zinc-800/80 text-zinc-100' 
        : 'bg-white/90 border-slate-200 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 text-white shrink-0 overflow-hidden ring-1 ring-white/10">
              <img
                src="/icons/icon-192.png"
                alt="Finance IA"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={`font-extrabold text-sm sm:text-base tracking-tight ${isBlack ? 'text-zinc-100' : 'text-slate-900'}`}>
                  Finance IA
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-wide uppercase">
                  IA Pro
                </span>
              </div>
              <p className={`text-[11px] hidden sm:block ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
                Controle inteligente por áudio, fotos e IA
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className={`hidden md:flex items-center p-1 rounded-2xl border ${
            isBlack ? 'bg-zinc-900/90 border-zinc-800/80' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? isBlack ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : isBlack ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visão Geral
            </button>
            <button
              id="nav-tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'chat'
                  ? isBlack ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : isBlack ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              Chat IA
            </button>
            <button
              id="nav-tab-transactions"
              onClick={() => setActiveTab('transactions')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                activeTab === 'transactions'
                  ? isBlack ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : isBlack ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Extrato
            </button>
            <button
              id="nav-tab-charts"
              onClick={() => setActiveTab('charts')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                activeTab === 'charts'
                  ? isBlack ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : isBlack ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gráficos
            </button>
            <button
              id="nav-tab-caixinhas"
              onClick={() => setActiveTab('caixinhas')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center gap-1 ${
                activeTab === 'caixinhas'
                  ? isBlack ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : isBlack ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5 text-emerald-500" />
              Caixinhas
            </button>
          </nav>

          {/* Quick Actions, Theme Switch & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Theme Toggle Button (Dark / Normal) */}
            <button
              id="btn-theme-toggle-nav"
              onClick={onToggleTheme}
              title={isBlack ? 'Alternar para Modo Normal (Claro)' : 'Alternar para Modo Dark'}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isBlack
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-amber-400 border-zinc-800'
                  : 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-200 shadow-xs'
              }`}
            >
              {isBlack ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px]">
                {isBlack ? 'Modo Normal' : 'Modo Dark'}
              </span>
            </button>

            {/* Quick Voice Entry */}
            <button
              id="btn-quick-voice-nav"
              onClick={onOpenVoiceModal}
              title="Gravar áudio com despesa ou pergunta"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isBlack
                  ? 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:text-emerald-400'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-emerald-600 shadow-xs'
              }`}
            >
              <Mic className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Quick Receipt Scan */}
            <button
              id="btn-quick-receipt-nav"
              onClick={onOpenReceiptModal}
              title="Escanear nota fiscal ou comprovante"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isBlack
                  ? 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:text-emerald-400'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-emerald-600 shadow-xs'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-400" />
            </button>

            {/* New Manual Transaction (Desktop) */}
            <button
              id="btn-new-transaction-nav"
              onClick={onOpenNewTransaction}
              className="hidden sm:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-lg shadow-emerald-950/50 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo</span>
            </button>

            {/* User Profile Button */}
            <button
              id="btn-user-profile"
              onClick={onOpenProfileDrawer}
              title={`Perfil: ${currentUser.name}`}
              className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border transition-all cursor-pointer ${
                isBlack
                  ? 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${
                  currentUser.id === 'gustavo'
                    ? 'from-emerald-600 to-teal-700'
                    : 'from-rose-500 to-pink-600'
                } flex items-center justify-center text-white font-bold text-xs shadow-sm`}
              >
                {currentUser.avatar}
              </div>
              <span className="hidden sm:inline font-bold text-xs">
                {currentUser.name}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
