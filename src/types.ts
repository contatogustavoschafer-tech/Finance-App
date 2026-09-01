export type TransactionType = 'DESPESA' | 'RECEITA';

export type PaymentMethod = 
  | 'PIX'
  | 'Cartão de Crédito'
  | 'Cartão de Débito'
  | 'Dinheiro'
  | 'Boleto'
  | 'Transferência'
  | 'Outro';

export type TransactionStatus = 'Pago' | 'Pendente' | 'Agendado';

export type TransactionSource = 'audio' | 'image' | 'text' | 'manual';

export type AppUserId = 'gustavo' | 'carolina';

export interface AppUser {
  id: AppUserId;
  name: string;
  avatar: string;
  color: string;
  needsPasswordChange: boolean;
  passwordHash?: string;
  updatedAt?: string;
}

export interface AuthSession {
  user: AppUser;
  token: string;
  expiresAt: number;
}

export interface Transaction {
  id: string;
  userId?: AppUserId;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes?: string;
  source: TransactionSource;
  syncedToSheets: boolean;
  sheetRowIndex?: number;
  createdAt: string;
}

export interface ParsedTransactionResult {
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes?: string;
  confidence: number;
  rawTranscription?: string;
  suggestedAction?: 'create' | 'query' | 'multiple';
  multipleTransactions?: Array<{
    description: string;
    amount: number;
    type: TransactionType;
    category: string;
    date: string;
    paymentMethod: PaymentMethod;
    status?: TransactionStatus;
    notes?: string;
  }>;
}

export interface SheetConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
  isConnected: boolean;
  lastSyncedAt?: string;
  autoSync: boolean;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  mediaType?: 'audio' | 'image' | 'text';
  mediaPreview?: string;
  audioBlob?: string;
  parsedTransaction?: ParsedTransactionResult;
  isActionExecuted?: boolean;
  suggestedChips?: string[];
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  transactionCount: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  recentActivity: Transaction[];
}

export interface BudgetGoal {
  category: string;
  limit: number;
}

export interface ExpenseFilter {
  type: 'ALL' | 'DESPESA' | 'RECEITA';
  category: string;
  month: string; // YYYY-MM or 'ALL'
  search: string;
  paymentMethod: string;
  syncedOnly: boolean;
}
