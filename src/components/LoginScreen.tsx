import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Heart,
  Shield,
} from 'lucide-react';
import { AppUser, AppUserId } from '../types';
import { DEFAULT_USERS, authenticateUser, updateUserPassword } from '../services/firebaseService';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [selectedUser, setSelectedUser] = useState<AppUserId>('gustavo');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados para troca obrigatória de senha
  const [pendingUser, setPendingUser] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password) {
      setErrorMessage('Por favor, digite a sua senha.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authenticateUser(selectedUser, password);
      if (res.success && res.user) {
        // Verifica se é o primeiro acesso ou se precisa trocar a senha
        if (res.user.needsPasswordChange || password === '12345678') {
          setPendingUser(res.user);
        } else {
          onLoginSuccess(res.user);
        }
      } else {
        setErrorMessage(res.message || 'Senha incorreta. Tente novamente.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao conectar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');

    if (!pendingUser) return;

    if (!newPassword || newPassword.length < 4) {
      setChangeError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (newPassword === '12345678') {
      setChangeError('A nova senha não pode ser a senha padrão 12345678.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeError('As senhas digitadas não coincidem.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await updateUserPassword(pendingUser.id, newPassword);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setChangeError(res.message || 'Erro ao salvar nova senha.');
      }
    } catch (err: any) {
      setChangeError(err?.message || 'Falha ao atualizar a senha.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 sm:px-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[20%] w-[350px] h-[350px] bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[20%] w-[350px] h-[350px] bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* App Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-900/60 via-zinc-900 to-zinc-950 border border-emerald-500/30 p-1 shadow-2xl shadow-emerald-950/60 mb-4 ring-1 ring-white/10">
            <img
              src="/icons/icon-192.png"
              alt="Finance IA Logo"
              className="w-full h-full object-cover rounded-[20px]"
              onError={(e) => {
                // Fallback visual se a imagem ainda estiver carregando
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            Finance IA
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              Casal
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Controle financeiro pessoal inteligente e sincronizado
          </p>
        </div>

        {/* Modal / Card */}
        <div className="bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative">
          {!pendingUser ? (
            /* Formulário de Login Normal */
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Seletor de Perfil (Gustavo ou Carolina) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Quem está entrando?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Perfil Gustavo */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser('gustavo');
                      setErrorMessage('');
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      selectedUser === 'gustavo'
                        ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      G
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Gustavo</div>
                      <div className="text-[10px] text-zinc-400">Conta Pessoal</div>
                    </div>
                  </button>

                  {/* Perfil Carolina */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser('carolina');
                      setErrorMessage('');
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      selectedUser === 'carolina'
                        ? 'bg-rose-950/50 border-rose-500 text-white shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/40'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      C
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">Carolina</div>
                      <div className="text-[10px] text-zinc-400">Conta Pessoal</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Campo de Senha */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300">
                    Senha de Acesso
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Inicial: <code className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60 font-mono">12345678</code>
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-zinc-600 rounded-2xl py-3 pl-10 pr-11 text-sm transition-all outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-2xl shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar no Finance IA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Nota de Segurança / Sincronização */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sincronização em nuvem via Firebase Artemis</span>
              </div>
            </form>
          ) : (
            /* Fluxo Obrigatório de Troca de Senha no 1º Acesso */
            <form onSubmit={handleForceChangePassword} className="space-y-5 animate-fade-in">
              <div className="text-center pb-2 border-b border-zinc-800">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  Troca de Senha Obrigatória
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Olá, <span className="text-emerald-400 font-semibold">{pendingUser.name}</span>! Por segurança, defina uma nova senha pessoal antes de continuar.
                </p>
              </div>

              {/* Nova Senha */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nova Senha Pessoal
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-zinc-600 rounded-2xl py-3 px-4 text-sm transition-all outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Confirmar Nova Senha
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white placeholder-zinc-600 rounded-2xl py-3 px-4 text-sm transition-all outline-none"
                />
              </div>

              {/* Erro de Troca de Senha */}
              {changeError && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{changeError}</span>
                </div>
              )}

              {/* Botão de Salvar Nova Senha */}
              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-[0.98] text-zinc-950 font-bold py-3.5 px-4 rounded-2xl shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm cursor-pointer"
              >
                {isChangingPassword ? (
                  <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar Senha & Acessar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPendingUser(null)}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-1"
              >
                Voltar para a tela inicial
              </button>
            </form>
          )}
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          Finance IA &bull; Gustavo &amp; Carolina &bull; 2026
        </p>
      </div>
    </div>
  );
};
