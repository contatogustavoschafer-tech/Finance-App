import { Transaction } from '../types';

export interface GoogleUserSession {
  accessToken: string;
  email?: string;
  name?: string;
  picture?: string;
  expiresAt: number;
}

const STORAGE_SESSION_KEY = 'fin_google_session';
const STORAGE_CONFIG_KEY = 'fin_sheet_config';

export function getStoredGoogleSession(): GoogleUserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const session: GoogleUserSession = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      // Session expired
      localStorage.removeItem(STORAGE_SESSION_KEY);
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

export function saveGoogleSession(session: GoogleUserSession) {
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
}

export function clearGoogleSession() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

export const SHEET_HEADERS = [
  'ID',
  'Data',
  'Tipo',
  'Categoria',
  'Descrição',
  'Valor (R$)',
  'Forma de Pagamento',
  'Status',
  'Origem',
  'Observações',
  'Cadastrado em',
];

/**
 * Creates a formatted financial spreadsheet in the user's Google Drive.
 */
export async function createFinancialSpreadsheet(
  accessToken: string,
  title: string = 'Controle Financeiro - Assistente IA'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const payload = {
    properties: {
      title,
      locale: 'pt_BR',
      timeZone: 'America/Sao_Paulo',
    },
    sheets: [
      {
        properties: {
          title: 'Transações',
          gridProperties: {
            frozenRowCount: 1,
            columnCount: 11,
          },
        },
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao criar planilha no Google Sheets');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write headers & initial styling
  await setSpreadsheetHeadersAndFormat(accessToken, spreadsheetId);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Sets bold headers, emerald theme colors and column widths for the spreadsheet.
 */
export async function setSpreadsheetHeadersAndFormat(accessToken: string, spreadsheetId: string) {
  // 1. Write Header row
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transações!A1:K1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Transações!A1:K1',
        majorDimension: 'ROWS',
        values: [SHEET_HEADERS],
      }),
    }
  );

  // 2. Format Header with dark emerald background and white bold text
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 11,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.06, green: 0.45, blue: 0.35 }, // Emerald dark #0f766e
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 10,
                  },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 4, // Descrição
                endIndex: 5,
              },
              properties: {
                pixelSize: 220,
              },
              fields: 'pixelSize',
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.warn('Formatting spreadsheet batchUpdate warning:', err);
  }
}

/**
 * Appends a transaction to the Google Sheet.
 */
export async function appendTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  transaction: Transaction
): Promise<boolean> {
  const rowValue = [
    transaction.id,
    transaction.date,
    transaction.type,
    transaction.category,
    transaction.description,
    transaction.amount,
    transaction.paymentMethod,
    transaction.status,
    transaction.source,
    transaction.notes || '',
    new Date(transaction.createdAt).toLocaleString('pt-BR'),
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transações!A:K:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValue],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao salvar linha no Google Sheets');
  }

  return true;
}

/**
 * Batch append multiple transactions to the sheet.
 */
export async function batchAppendTransactionsToSheet(
  accessToken: string,
  spreadsheetId: string,
  transactions: Transaction[]
): Promise<boolean> {
  if (!transactions.length) return true;

  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.type,
    t.category,
    t.description,
    t.amount,
    t.paymentMethod,
    t.status,
    t.source,
    t.notes || '',
    new Date(t.createdAt).toLocaleString('pt-BR'),
  ]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transações!A:K:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao sincronizar lote de transações com Google Sheets');
  }

  return true;
}

/**
 * Fetches all transactions directly from the connected Google Sheet.
 */
export async function fetchTransactionsFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Transaction[]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transações!A2:K1000`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao ler transações do Google Sheets');
  }

  const data = await response.json();
  const rows: any[][] = data.values || [];

  return rows.map((row, index) => {
    const [
      id,
      date,
      type,
      category,
      description,
      amountRaw,
      paymentMethod,
      status,
      source,
      notes,
      createdAt,
    ] = row;

    let amount = 0;
    if (typeof amountRaw === 'number') {
      amount = amountRaw;
    } else if (typeof amountRaw === 'string') {
      // Parse string like "R$ 45,90" or "45.90"
      const cleanNum = amountRaw.replace(/[^\d,-]/g, '').replace(',', '.');
      amount = parseFloat(cleanNum) || 0;
    }

    return {
      id: id || `sheet-${index + 2}`,
      date: date || new Date().toISOString().split('T')[0],
      type: (type === 'RECEITA' ? 'RECEITA' : 'DESPESA') as any,
      category: category || 'Outros',
      description: description || 'Sem descrição',
      amount: Math.abs(amount),
      paymentMethod: (paymentMethod || 'PIX') as any,
      status: (status === 'Pendente' ? 'Pendente' : 'Pago') as any,
      source: (source || 'manual') as any,
      notes: notes || '',
      syncedToSheets: true,
      sheetRowIndex: index + 2,
      createdAt: createdAt || new Date().toISOString(),
    };
  });
}

/**
 * Fetches user profile from Google OAuth userInfo API
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<{ email: string; name: string; picture: string }> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        email: data.email || '',
        name: data.name || '',
        picture: data.picture || '',
      };
    }
  } catch (e) {
    console.warn('Could not fetch user profile:', e);
  }
  return { email: '', name: '', picture: '' };
}
