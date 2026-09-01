import { ParsedTransactionResult, ChatMessage, FinancialSummary, BudgetGoal, Transaction } from '../types';

export interface ParseTransactionPayload {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  audioBase64?: string;
  audioMimeType?: string;
}

function sanitizeBase64(str?: string): string | undefined {
  if (!str) return undefined;
  return str.trim();
}

function sanitizeMime(mime?: string): string | undefined {
  if (!mime) return undefined;
  return mime.split(';')[0].trim();
}

export async function parseFinancialTransactionWithAI(payload: ParseTransactionPayload): Promise<ParsedTransactionResult> {
  const sanitizedPayload: ParseTransactionPayload = {
    ...payload,
    audioBase64: sanitizeBase64(payload.audioBase64),
    audioMimeType: sanitizeMime(payload.audioMimeType),
    imageBase64: sanitizeBase64(payload.imageBase64),
    mimeType: sanitizeMime(payload.mimeType),
  };

  const response = await fetch('/api/ai/parse-transaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sanitizedPayload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao processar com IA');
  }

  const result = await response.json();
  return result.data;
}

export interface ChatAssistantPayload {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  transactionsContext?: Transaction[];
  financialSummary?: FinancialSummary;
  budgetGoals?: BudgetGoal[];
  audioBase64?: string;
  audioMimeType?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface ChatAssistantResponse {
  success: boolean;
  reply: string;
  proposedTransaction?: ParsedTransactionResult | null;
  suggestedChips?: string[];
}

export async function sendChatMessageToAI(payload: ChatAssistantPayload): Promise<ChatAssistantResponse> {
  const sanitizedPayload: ChatAssistantPayload = {
    ...payload,
    audioBase64: sanitizeBase64(payload.audioBase64),
    audioMimeType: sanitizeMime(payload.audioMimeType),
    imageBase64: sanitizeBase64(payload.imageBase64),
    imageMimeType: sanitizeMime(payload.imageMimeType),
  };

  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sanitizedPayload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha na resposta do assistente');
  }

  return await response.json();
}
