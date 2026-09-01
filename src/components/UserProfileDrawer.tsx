import React, { useState } from 'react';
import {
  X,
  User,
  KeyRound,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Smartphone,
  Cloud,
  Layers,
} from 'lucide-react';
import { AppUser } from '../types';
import { updateUserPassword } from '../services/firebaseService';

interface UserProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onLogout: () => void;
  themeMode: 'black' | 'light';
  onToggleTheme: () => void;
  onUserUpdated: (user: AppUser) => void;
}

export const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  themeMode,
  onToggleTheme,
  onUserUpdated,
}) => {
  const isBlack = themeMode === 'black';

  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!newPassword || newPassword.length < 4) {
      setPassError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await updateUserPassword(currentUser.id, newPassword);
      if (res.success && res.user) {
        setPassSuccess('Senha alterada com sucesso!');
        onUserUpdated(res.user);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsChangingPass(false);
          setPassSuccess('');
        }, 1500);
      } else {
        setPassError(res.message || 'Erro ao alterar senha.');
      }
    } catch (err: any) {
      setPassError(err?.message || 'Falha ao conectar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-full max-w-md h-full shadow-2xl flex flex-col z-10 overflow-y-auto transition-transform ${
          isBlack
            ? 'bg-zinc-950 border-l border-zinc-800 text-zinc-100'
            : 'bg-white border-l border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-500" />
            <h2 className="font-bold text-base">Minha Conta</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isBlack ? 'hover:bg-zinc-900 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-5 space-y-6">
          <div
            className={`p-4 rounded-3xl border flex items-center gap-4 ${
              isBlack
                ? 'bg-zinc-900/60 border-zinc-800/80'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${
                currentUser.id === 'gustavo'
                  ? 'from-emerald-600 to-teal-700'
                  : 'from-rose-500 to-pink-600'
              } flex items-center justify-center text-white font-extrabold text-xl shadow-lg`}
            >
              {currentUser.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">{currentUser.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Online
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Conta Pessoal Finance IA
              </p>
            </div>
          </div>

          {/* Sincronização e Nuvem */}
          <div
            className={`p-4 rounded-2xl border space-y-2.5 ${
              isBlack ? 'bg-zinc-900/40 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-zinc-400">
                <Cloud className="w-4 h-4 text-emerald-400" />
                Banco de Dados
              </span>
              <span className="text-emerald-400 font-mono">Firebase Artemis</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Sincronização
              </span>
              <span className="text-zinc-300">Tempo Real (Ativa)</span>
            </div>
          </div>

          {/* Ações e Preferências */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">
              Preferências
            </h4>

            {/* Alternar Tema */}
            <button
              onClick={onToggleTheme}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-sm font-semibold ${
                isBlack
                  ? 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800 text-zinc-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {isBlack ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                <span>Tema do Aplicativo</span>
              </div>
              <span className="text-xs font-bold text-zinc-400">
                {isBlack ? 'Modo Black OLED' : 'Modo Claro'}
              </span>
            </button>

            {/* Trocar Senha */}
            <button
              onClick={() => setIsChangingPass(!isChangingPass)}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-sm font-semibold ${
                isBlack
                  ? 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800 text-zinc-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                <span>Alterar Minha Senha</span>
              </div>
              <span className="text-xs text-zinc-500">
                {isChangingPass ? 'Fechar' : 'Editar'}
              </span>
            </button>

            {/* Formulário de Troca de Senha Retrátil */}
            {isChangingPass && (
              <form
                onSubmit={handleChangePassword}
                className={`p-4 rounded-2xl border space-y-3 animate-fade-in ${
                  isBlack ? 'bg-zinc-900/90 border-zinc-700' : 'bg-slate-100 border-slate-300'
                }`}
              >
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                {passError && (
                  <div className="text-red-400 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{passError}</span>
                  </div>
                )}

                {passSuccess && (
                  <div className="text-emerald-400 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{passSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer / Logout */}
        <div className="mt-auto p-5 border-t border-zinc-800/80">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-red-950/40 hover:bg-red-950/70 border border-red-800/60 text-red-300 font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Trocar de Usuário / Sair</span>
          </button>
        </div>
      </div>
    </div>
  );
};
