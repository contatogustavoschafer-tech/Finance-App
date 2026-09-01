import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Link,
  Key,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { SheetConfig, Transaction } from '../types';
import {
  createFinancialSpreadsheet,
  saveGoogleSession,
  getStoredGoogleSession,
  clearGoogleSession,
  fetchTransactionsFromSheet,
  batchAppendTransactionsToSheet,
  setSpreadsheetHeadersAndFormat,
} from '../services/sheetsService';

interface GoogleSheetsConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetConfig: SheetConfig;
  onUpdateSheetConfig: (config: SheetConfig) => void;
  transactions: Transaction[];
  onImportTransactions: (transactions: Transaction[]) => void;
}

export const GoogleSheetsConnectModal: React.FC<GoogleSheetsConnectModalProps> = ({
  isOpen,
  onClose,
  sheetConfig,
  onUpdateSheetConfig,
  transactions,
  onImportTransactions,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'existing' | 'token'>('create');
  const [spreadsheetInput, setSpreadsheetInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  // Extract ID from full URL or return ID as is
  const extractSpreadsheetId = (urlOrId: string): string => {
    const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return urlOrId.trim();
  };

  // Trigger Google OAuth Flow via Google Identity Services (GSI)
  const handleGoogleAuth = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Iniciando autenticação com o Google...');

    try {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: '568022878517-client.apps.googleusercontent.com', // Provisioned OAuth Client
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (response: any) => {
            if (response.error) {
              setErrorMessage(`Erro no login do Google: ${response.error_description || response.error}`);
              setIsProcessing(false);
              return;
            }

            const accessToken = response.access_token;
            const expiresIn = response.expires_in || 3599;
            const expiresAt = Date.now() + expiresIn * 1000;

            saveGoogleSession({
              accessToken,
              expiresAt,
            });

            // Automatically create financial spreadsheet
            await handleCreateAutomatedSheet(accessToken);
          },
        });

        client.requestAccessToken();
      } else {
        // Fallback: prompt for token or manual setup
        setActiveTab('token');
        setErrorMessage('Google Identity Services ainda carregando ou bloqueado por pop-up. Você pode colar seu Access Token ou autenticar.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMessage(err.message || 'Erro ao inicializar autenticação');
      setIsProcessing(false);
    }
  };

  // Create new automated spreadsheet with emerald styling
  const handleCreateAutomatedSheet = async (token?: string) => {
    const currentToken = token || tokenInput.trim();
    if (!currentToken) {
      setErrorMessage('Por favor, autentique com o Google ou insira seu token de acesso.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Criando e formatando planilha no seu Google Drive...');

    try {
      const { spreadsheetId, spreadsheetUrl } = await createFinancialSpreadsheet(
        currentToken,
        'Controle Financeiro - Assistente IA'
      );

      // Batch sync current transactions if any
      if (transactions.length > 0) {
        setStatusMessage(`Sincronizando ${transactions.length} lançamentos iniciais com a nova planilha...`);
        await batchAppendTransactionsToSheet(currentToken, spreadsheetId, transactions);
      }

      onUpdateSheetConfig({
        spreadsheetId,
        spreadsheetUrl,
        sheetName: 'Controle Financeiro - Assistente IA',
        isConnected: true,
        lastSyncedAt: new Date().toISOString(),
        autoSync: true,
      });

      setStatusMessage('Planilha criada com sucesso no seu Google Drive!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Create sheet error:', err);
      setErrorMessage(err.message || 'Erro ao criar planilha');
    } finally {
      setIsProcessing(false);
    }
  };

  // Connect existing sheet
  const handleConnectExisting = async () => {
    const rawInput = spreadsheetInput.trim();
    if (!rawInput) {
      setErrorMessage('Por favor, informe a URL ou ID da planilha.');
      return;
    }

    const sheetId = extractSpreadsheetId(rawInput);
    const session = getStoredGoogleSession();
    const token = tokenInput.trim() || session?.accessToken;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Conectando e atualizando planilha...');

    try {
      if (token) {
        // Ensure headers & format
        try {
          await setSpreadsheetHeadersAndFormat(token, sheetId);
        } catch (e) {
          console.warn('Headers check warning:', e);
        }

        // Push all local transactions so sheet is never blank
        if (transactions.length > 0) {
          setStatusMessage(`Enviando ${transactions.length} lançamentos para a planilha conectada...`);
          await batchAppendTransactionsToSheet(token, sheetId, transactions);
        }

        // Try to fetch existing rows
        const imported = await fetchTransactionsFromSheet(token, sheetId);
        if (imported.length > 0) {
          onImportTransactions(imported);
          setStatusMessage(`${imported.length} lançamentos sincronizados com sucesso!`);
        }
      }

      onUpdateSheetConfig({
        spreadsheetId: sheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        sheetName: 'Planilha Conectada',
        isConnected: true,
        lastSyncedAt: new Date().toISOString(),
        autoSync: true,
      });

      setStatusMessage('Planilha conectada e sincronizada com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Connect existing error:', err);
      setErrorMessage(err.message || 'Não foi possível conectar à planilha. Verifique as permissões de acesso.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Disconnect
  const handleDisconnect = () => {
    clearGoogleSession();
    onUpdateSheetConfig({
      spreadsheetId: '',
      spreadsheetUrl: '',
      sheetName: '',
      isConnected: false,
      autoSync: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-950/50">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-zinc-100">Integração Google Sheets</h2>
              <p className="text-xs text-zinc-400">
                Sincronize despesas e receitas automaticamente na sua planilha
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

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          {/* Active Connection Card if Connected */}
          {sheetConfig.isConnected && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Google Sheets Conectado e Ativo</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Desconectar
                </button>
              </div>

              <div className="text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Planilha:</span>
                  <span className="font-bold truncate max-w-xs">{sheetConfig.sheetName || 'Controle Financeiro'}</span>
                </div>
                {sheetConfig.lastSyncedAt && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Última sincronização:</span>
                    <span>{new Date(sheetConfig.lastSyncedAt).toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={sheetConfig.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  <span>Abrir Planilha no Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Navigation Mode Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 px-2 rounded-lg font-bold transition-all ${
                activeTab === 'create' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Criar Nova
            </button>
            <button
              onClick={() => setActiveTab('existing')}
              className={`py-2 px-2 rounded-lg font-bold transition-all ${
                activeTab === 'existing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Conectar URL
            </button>
            <button
              onClick={() => setActiveTab('token')}
              className={`py-2 px-2 rounded-lg font-bold transition-all ${
                activeTab === 'token' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Autenticação
            </button>
          </div>

          {/* TAB 1: Create New Automated Sheet */}
          {activeTab === 'create' && (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Estrutura Automática Pronta</span>
                </div>
                <p className="text-xs text-slate-600">
                  O assistente criará uma planilha formatada com cabeçalhos profissionais (Data, Tipo, Categoria, Descrição, Valor, Forma de Pagamento, Comprovante).
                </p>
              </div>

              <button
                id="btn-google-auth-create"
                onClick={handleGoogleAuth}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isProcessing ? 'Conectando ao Google...' : 'Conectar com Google & Criar Planilha'}</span>
              </button>
            </div>
          )}

          {/* TAB 2: Connect Existing Sheet */}
          {activeTab === 'existing' && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  URL ou ID da Planilha do Google Sheets
                </label>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/1A2B3C.../edit"
                  value={spreadsheetInput}
                  onChange={(e) => setSpreadsheetInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  Certifique-se de que a planilha possui a aba chamada <strong>"Transações"</strong> ou permissões de edição para a sua conta Google.
                </p>
              </div>

              <button
                onClick={handleConnectExisting}
                disabled={isProcessing || !spreadsheetInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                <Link className="w-4 h-4" />
                <span>Vincular Planilha Existente</span>
              </button>
            </div>
          )}

          {/* TAB 3: Token / Manual Authorization */}
          {activeTab === 'token' && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Access Token OAuth do Google (Opcional para conexões personalizadas)
                </label>
                <input
                  type="password"
                  placeholder="ya29.a0AfH6SM..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Se você já gerou um token de acesso com o escopo <code>https://www.googleapis.com/auth/spreadsheets</code>, cole-o acima para conectar diretamente.
              </p>

              <button
                onClick={() => handleCreateAutomatedSheet()}
                disabled={isProcessing || !tokenInput.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                <Key className="w-4 h-4" />
                <span>Usar Token e Criar Planilha</span>
              </button>
            </div>
          )}

          {/* Status and Error Messages */}
          {statusMessage && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
