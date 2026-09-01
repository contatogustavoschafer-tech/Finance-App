import React from 'react';
import {
  LayoutDashboard,
  Bot,
  ReceiptText,
  PieChart,
  PiggyBank,
  Plus,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'dashboard' | 'chat' | 'transactions' | 'charts' | 'caixinhas';
  setActiveTab: (tab: 'dashboard' | 'chat' | 'transactions' | 'charts' | 'caixinhas') => void;
  onOpenNewTransaction: () => void;
  themeMode: 'black' | 'light';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTransaction,
  themeMode,
}) => {
  const isBlack = themeMode === 'black';

  const navItems = [
    { id: 'dashboard', label: 'Geral', icon: LayoutDashboard },
    { id: 'chat', label: 'Chat IA', icon: Bot, isSpecial: true },
    { id: 'action', label: 'Novo', isAction: true },
    { id: 'transactions', label: 'Extrato', icon: ReceiptText },
    { id: 'charts', label: 'Gráficos', icon: PieChart },
    { id: 'caixinhas', label: 'Metas', icon: PiggyBank },
  ] as const;

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t transition-all pb-[env(safe-area-inset-bottom,12px)] ${
        isBlack
          ? 'bg-zinc-950/95 backdrop-blur-2xl border-zinc-800/80 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.8)]'
          : 'bg-white/95 backdrop-blur-2xl border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
        {/* Tab Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all active:scale-90 ${
            activeTab === 'dashboard'
              ? isBlack ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold'
              : isBlack ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight">Geral</span>
        </button>

        {/* Tab Chat IA */}
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all active:scale-90 relative ${
            activeTab === 'chat'
              ? isBlack ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold'
              : isBlack ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <div className="relative">
            <Bot className={`w-5 h-5 mb-0.5 ${activeTab === 'chat' ? 'stroke-[2.5] text-emerald-400' : 'stroke-[1.8]'}`} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <span className="text-[10px] tracking-tight">Chat IA</span>
        </button>

        {/* Botão Central Rápido (+) */}
        <div className="flex items-center justify-center -mt-5">
          <button
            onClick={onOpenNewTransaction}
            title="Adicionar Transação"
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/70 active:scale-90 transition-transform ring-4 ring-zinc-950"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Tab Extrato */}
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all active:scale-90 ${
            activeTab === 'transactions'
              ? isBlack ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold'
              : isBlack ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <ReceiptText className={`w-5 h-5 mb-0.5 ${activeTab === 'transactions' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight">Extrato</span>
        </button>

        {/* Tab Metas / Caixinhas */}
        <button
          onClick={() => setActiveTab('caixinhas')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all active:scale-90 ${
            activeTab === 'caixinhas'
              ? isBlack ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold'
              : isBlack ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <PiggyBank className={`w-5 h-5 mb-0.5 ${activeTab === 'caixinhas' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] tracking-tight">Caixinhas</span>
        </button>
      </div>
    </div>
  );
};
