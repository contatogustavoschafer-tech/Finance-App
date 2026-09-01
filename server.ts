import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Increase payload limit for base64 audio and receipt images
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Helper to reliably sanitize and extract raw base64 data and clean MIME types
function cleanMediaPayload(base64Input?: string, providedMimeType?: string, defaultMime: string = 'application/octet-stream') {
  if (!base64Input || typeof base64Input !== 'string') return null;

  let raw = base64Input.trim();
  let mime = (providedMimeType || '').trim();

  // If data starts with data URI scheme: data:audio/webm;codecs=opus;base64,AAAA...
  if (raw.startsWith('data:')) {
    const commaIndex = raw.indexOf(',');
    if (commaIndex !== -1) {
      const header = raw.slice(5, commaIndex); // e.g. "audio/webm;codecs=opus;base64"
      raw = raw.slice(commaIndex + 1);
      
      const headerMime = header.split(';')[0];
      if (headerMime && headerMime.includes('/')) {
        mime = headerMime;
      }
    }
  } else if (raw.includes(';base64,')) {
    const parts = raw.split(';base64,');
    raw = parts[parts.length - 1];
  } else if (raw.includes('base64,')) {
    const parts = raw.split('base64,');
    raw = parts[parts.length - 1];
  }

  // Strip parameters like ;codecs=... from MIME type
  if (mime.includes(';')) {
    mime = mime.split(';')[0].trim();
  }

  // Fallback if still empty or invalid
  if (!mime || !mime.includes('/')) {
    mime = defaultMime;
  }

  // Normalize common types for Gemini API
  if (mime === 'image/jpg') mime = 'image/jpeg';
  if (mime.startsWith('audio/webm')) mime = 'audio/webm';
  if (mime.startsWith('audio/ogg')) mime = 'audio/ogg';
  if (mime.startsWith('audio/mp4') || mime.startsWith('audio/m4a') || mime.startsWith('audio/x-m4a')) mime = 'audio/mp4';

  // Remove any whitespace or newline characters from base64 string
  const cleanData = raw.replace(/[\r\n\s]+/g, '');

  if (!cleanData) return null;

  return {
    mimeType: mime,
    data: cleanData,
  };
}

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. AI features will run in mock/fallback mode.');
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateContentWithFallback(ai: GoogleGenAI, params: {
  contents: any[];
  config?: any;
}) {
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];
  const MAX_RETRIES = 3;
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err?.status === 503 ||
          err?.status === 429 ||
          err?.status === 500 ||
          (err?.message || '').toLowerCase().includes('overload') ||
          (err?.message || '').toLowerCase().includes('unavailable');

        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = attempt * 1200; // 1.2s, 2.4s
          console.warn(`Model ${model} retryable error (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms:`, err?.message);
          await sleep(delay);
          continue;
        }

        console.warn(`Model ${model} failed permanently (attempt ${attempt}):`, err?.message || err);
        break; // Tenta o próximo modelo
      }
    }
  }

  throw lastError || new Error('Todos os modelos de IA do Gemini estão temporariamente indisponíveis.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint: AI Transaction Parser (Text, Image, Audio)
app.post('/api/ai/parse-transaction', async (req, res) => {
  try {
    const { text, imageBase64, mimeType, audioBase64, audioMimeType } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback parser if API key is not configured yet
      const today = new Date().toISOString().split('T')[0];
      return res.json({
        success: true,
        data: {
          description: text || 'Despesa Lançada',
          amount: 50.0,
          type: 'DESPESA',
          category: 'Alimentação',
          date: today,
          paymentMethod: 'PIX',
          status: 'Pago',
          confidence: 0.8,
          notes: 'Identificado via fallback local',
          rawTranscription: text || 'Lançamento manual/sem API Key',
        },
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const systemPrompt = `Você é um assistente financeiro especialista em extração e estruturação de transações financeiras pessoais (receitas e despesas) para o Brasil.
A data de hoje de referência é: ${todayStr}.

Analise o conteúdo fornecido (que pode ser uma gravação de áudio, imagem de cupom fiscal/nota/rascunho/PIX, ou texto digitado).
Sua tarefa é extrair com extrema precisão os dados financeiros e retornar SEMPRE um JSON válido no formato especificado.

Regras de extração:
1. "description": Nome claro e conciso do estabelecimento ou item (Ex: "Supermercado Carrefour", "Almoço Restaurante", "Uber corrida", "Salário Empresa X", "Farmácia Droga Raia").
2. "amount": Valor numérico positivo em Reais (Ex: 45.90). Se houver desconto ou total, use o valor final pago.
3. "type": "DESPESA" ou "RECEITA". Se for gasto/compra/pagamento é "DESPESA". Se for recebimento/salário/freelance/venda/rendimento é "RECEITA".
4. "category": Escolha EXATAMENTE uma das seguintes categorias padrão:
   - "Alimentação" (restaurantes, lanches, delivery, café)
   - "Supermercado" (compras de mercado, hortifruti, padaria)
   - "Transporte" (uber, gasolina, ônibus, metrô, estacionamento, pedágio)
   - "Moradia & Contas" (aluguel, condomínio, luz, água, gás, internet)
   - "Saúde & Farmácia" (remédios, consultas, exames, academia)
   - "Lazer & Viagens" (cinema, passeios, viagens, shows, bares)
   - "Educação" (cursos, livros, mensalidade escolar)
   - "Compras & Vestuário" (roupas, eletrônicos, compras online)
   - "Assinaturas & Tech" (netflix, spotify, software, nuvem)
   - "Salário & Renda" (salário, adiantamento)
   - "Freelance & Serviços" (bicos, projetos, consultorias)
   - "Investimentos & Dividendos" (rendimentos, juros, dividendos)
   - "Outros"
5. "date": Data da transação no formato "YYYY-MM-DD". Se o cupom/áudio indicar uma data específica, use-a. Se o usuário disser "ontem", "anteontem", calcule relativo a ${todayStr}. Se não especificado, use ${todayStr}.
6. "paymentMethod": Um de: "PIX", "Cartão de Crédito", "Cartão de Débito", "Dinheiro", "Boleto", "Transferência", "Outro".
7. "status": "Pago" (padrão para compras já realizadas) ou "Pendente" (se for boleto a vencer, conta futura, etc.).
8. "notes": Resumo útil dos itens principais ou CNPJ/detalhes observados.
9. "rawTranscription": A transcrição exata do que foi dito no áudio ou do texto principal legível na imagem/nota.
10. "confidence": Número entre 0.0 e 1.0 indicando a certeza da extração.
11. Se o texto, áudio ou imagem contiver MÚLTIPLAS transações distintas ou uma lista de gastos (ex: "Gastei 30 na padaria, 150 no mercado e 45 no uber"), preencha o campo "multipleTransactions" com um array contendo cada uma das transações extraídas, com seus respectivos valores, descrições e categorias ("Alimentação", "Supermercado", "Transporte", "Moradia & Contas", "Saúde & Farmácia", "Lazer & Viagens", "Educação", "Compras & Vestuário", "Assinaturas & Tech", "Salário & Renda", "Freelance & Serviços", "Investimentos & Dividendos", "Outros"). Além disso, defina "suggestedAction" como "multiple".

Responda APENAS com o objeto JSON estruturado. Sem markdown extra ou explicações.`;

    const contents: any[] = [];

    // Add media parts
    if (audioBase64) {
      const media = cleanMediaPayload(audioBase64, audioMimeType, 'audio/webm');
      if (media) {
        contents.push({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data,
          },
        });
        contents.push({
          text: `Por favor, escute este áudio do usuário, transcreva o que foi falado e extraia a transação financeira em JSON. Se o usuário estiver fazendo uma pergunta sobre gastos, indique no notes ou categorization. Texto adicional se houver: ${text || ''}`,
        });
      }
    } else if (imageBase64) {
      const media = cleanMediaPayload(imageBase64, mimeType, 'image/jpeg');
      if (media) {
        contents.push({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data,
          },
        });
        contents.push({
          text: `Por favor, analise este comprovante fiscal / nota / rascunho / recibo / tela de pagamento bancário, extraia os valores, data, estabelecimento e classifique a transação em JSON. Texto adicional fornecido pelo usuário: ${text || 'Nenhum'}`,
        });
      }
    } else {
      contents.push({
        text: `Analise este texto financeiro do usuário e extraia a transação em JSON: "${text || ''}"`,
      });
    }

    const response = await generateContentWithFallback(ai, {
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text || '{}';
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch (err) {
      console.error('Failed to parse Gemini response as JSON:', responseText);
      parsedData = {
        description: text || 'Transação',
        amount: 0,
        type: 'DESPESA',
        category: 'Outros',
        date: todayStr,
        paymentMethod: 'PIX',
        status: 'Pago',
        notes: responseText,
        confidence: 0.5,
      };
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/parse-transaction:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar transação com IA',
    });
  }
});

// Endpoint: AI Financial Chat Assistant
app.post('/api/ai/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      transactionsContext = [],
      financialSummary,
      budgetGoals = [],
      audioBase64,
      audioMimeType,
      imageBase64,
      imageMimeType,
    } = req.body;

    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        reply: `Olá! Sou seu Assistente Financeiro IA. Notei que sua chave do Gemini ainda não foi configurada no ambiente. Mas você já pode usar a interface e sincronizar com seu Google Sheets! Para respostas completas e consultoria inteligente com IA, ative sua chave GEMINI_API_KEY.`,
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Build context data string
    const summaryText = financialSummary
      ? `Resumo Geral Atual:
- Total de Receitas: R$ ${financialSummary.totalIncome?.toFixed(2) || '0.00'}
- Total de Despesas: R$ ${financialSummary.totalExpenses?.toFixed(2) || '0.00'}
- Saldo Líquido: R$ ${financialSummary.balance?.toFixed(2) || '0.00'}
- Total de Transações: ${financialSummary.transactionCount || 0}`
      : 'Sem resumo disponível';

    const recentTxList = Array.isArray(transactionsContext) && transactionsContext.length > 0
      ? transactionsContext.slice(0, 150).map((t: any) => 
          `- [${t.date}] ${t.type}: ${t.description} | R$ ${Number(t.amount).toFixed(2)} | Categoria: ${t.category} | Pagamento: ${t.paymentMethod || 'N/A'} | Status: ${t.status || 'Pago'}`
        ).join('\n')
      : 'Nenhuma transação cadastrada ainda.';

    const budgetText = Array.isArray(budgetGoals) && budgetGoals.length > 0
      ? budgetGoals.map((b: any) => `- Meta para ${b.category}: Limite R$ ${b.limit}`).join('\n')
      : 'Nenhuma meta de orçamento definida.';

    const systemPrompt = `Você é o "Assistente Financeiro IA", um copiloto de inteligência financeira pessoal altamente inteligente, empático, proativo e organizado, especializado na realidade brasileira (BRL, PIX, cartões, notas fiscais e Google Sheets).
Data de referência hoje: ${todayStr}.

Seu objetivo:
1. Auxiliar o usuário a organizar seu dinheiro, controlar gastos, poupar e tirar dúvidas sobre a sua vida financeira.
2. Analisar as transações registradas na planilha/aplicativo para responder com números EXATOS e precisos (ex: "Quanto gastei em alimentação?", "Qual foi minha maior despesa?", "Como está meu saldo?").
3. Dar conselhos práticos e construtivos de finanças pessoais (regra 50-30-20, corte de supérfluos, reserva de emergência).
4. Identificar lançamentos de gastos ou ganhos quando o usuário pedir em áudio, imagem ou texto.

Contexto Financeiro Atual do Usuário:
${summaryText}

Metas de Orçamento:
${budgetText}

Últimas Transações Registradas na Planilha:
${recentTxList}

Instruções Especiais de Formatação e Ação:
- Sempre use formatação em Real brasileiro (R$ 1.250,00).
- Seja direto, claro, encorajador e amigável.
- Se o usuário pedir para lançar um novo gasto/receita ou enviar uma lista com VÁRIOS gastos (ex: "Gastei 150 no mercado, 30 de uber e 40 na farmácia"), categorize cada item separadamente e inclua no FINAL da sua resposta o seguinte bloco especial para o sistema processar a ação (se houver múltiplos itens, inclua o array "multipleTransactions" com cada item categorizado):
[ACTION_PROPOSE_TRANSACTION: {"description": "Resumo da lista ou item principal", "amount": 0.00, "type": "DESPESA"|"RECEITA", "category": "...", "date": "${todayStr}", "paymentMethod": "PIX"|"Cartão de Crédito"|"Cartão de Débito"|"Dinheiro"|"Boleto"|"Outro", "status": "Pago", "multipleTransactions": [{"description": "...", "amount": 0.00, "type": "DESPESA", "category": "...", "date": "${todayStr}", "paymentMethod": "PIX", "status": "Pago"}]}]
- Sugira 2 a 3 perguntas rápidas no final como sugestão em formato:
[SUGGESTED_CHIPS: ["Pergunta 1", "Pergunta 2", "Pergunta 3"]]`;

    const contents: any[] = [];

    // History formatting (últimas 10 mensagens para contexto mais rico)
    if (Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }

    const currentParts: any[] = [];

    if (audioBase64) {
      const media = cleanMediaPayload(audioBase64, audioMimeType, 'audio/webm');
      if (media) {
        currentParts.push({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data,
          },
        });
        currentParts.push({
          text: `[O usuário enviou uma gravação de voz]: "${message || 'Por favor, processe meu áudio e responda'}"`,
        });
      }
    } else if (imageBase64) {
      const media = cleanMediaPayload(imageBase64, imageMimeType, 'image/jpeg');
      if (media) {
        currentParts.push({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data,
          },
        });
        currentParts.push({
          text: `[O usuário enviou uma foto/imagem de nota ou comprovante]: "${message || 'Analise esta imagem financeira para mim'}"`,
        });
      }
    } else {
      currentParts.push({
        text: message,
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const response = await generateContentWithFallback(ai, {
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    const rawText = response.text || 'Desculpe, não consegui processar a resposta no momento.';

    // Extract action blocks and suggested chips if present
    let cleanReply = rawText;
    let proposedTransaction: any = null;
    let suggestedChips: string[] = [];

    const actionMatch = rawText.match(/\[ACTION_PROPOSE_TRANSACTION:\s*({[\s\S]*?})\]/);
    if (actionMatch) {
      try {
        proposedTransaction = JSON.parse(actionMatch[1]);
        cleanReply = cleanReply.replace(actionMatch[0], '').trim();
      } catch (e) {
        console.error('Failed to parse proposed transaction:', e);
      }
    }

    const chipsMatch = rawText.match(/\[SUGGESTED_CHIPS:\s*(\[[\s\S]*?\])\]/);
    if (chipsMatch) {
      try {
        suggestedChips = JSON.parse(chipsMatch[1]);
        cleanReply = cleanReply.replace(chipsMatch[0], '').trim();
      } catch (e) {
        console.error('Failed to parse suggested chips:', e);
      }
    }

    return res.json({
      success: true,
      reply: cleanReply,
      proposedTransaction,
      suggestedChips: suggestedChips.length > 0 ? suggestedChips : [
        'Quanto gastei este mês?',
        'Resumo por categorias',
        'Como posso economizar?',
      ],
    });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao comunicar com o assistente IA',
    });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Financial AI Assistant server running on http://localhost:${PORT}`);
  });
}

startServer();
