var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT) || 3e3;
app.use(import_express.default.json({ limit: "30mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "30mb" }));
function cleanMediaPayload(base64Input, providedMimeType, defaultMime = "application/octet-stream") {
  if (!base64Input || typeof base64Input !== "string") return null;
  let raw = base64Input.trim();
  let mime = (providedMimeType || "").trim();
  if (raw.startsWith("data:")) {
    const commaIndex = raw.indexOf(",");
    if (commaIndex !== -1) {
      const header = raw.slice(5, commaIndex);
      raw = raw.slice(commaIndex + 1);
      const headerMime = header.split(";")[0];
      if (headerMime && headerMime.includes("/")) {
        mime = headerMime;
      }
    }
  } else if (raw.includes(";base64,")) {
    const parts = raw.split(";base64,");
    raw = parts[parts.length - 1];
  } else if (raw.includes("base64,")) {
    const parts = raw.split("base64,");
    raw = parts[parts.length - 1];
  }
  if (mime.includes(";")) {
    mime = mime.split(";")[0].trim();
  }
  if (!mime || !mime.includes("/")) {
    mime = defaultMime;
  }
  if (mime === "image/jpg") mime = "image/jpeg";
  if (mime.startsWith("audio/webm")) mime = "audio/webm";
  if (mime.startsWith("audio/ogg")) mime = "audio/ogg";
  if (mime.startsWith("audio/mp4") || mime.startsWith("audio/m4a") || mime.startsWith("audio/x-m4a")) mime = "audio/mp4";
  const cleanData = raw.replace(/[\r\n\s]+/g, "");
  if (!cleanData) return null;
  return {
    mimeType: mime,
    data: cleanData
  };
}
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. AI features will run in mock/fallback mode.");
    return null;
  }
  return new import_genai.GoogleGenAI({ apiKey });
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function generateContentWithFallback(ai, params) {
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
  ];
  const MAX_RETRIES = 3;
  let lastError = null;
  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config
        });
        return response;
      } catch (err) {
        lastError = err;
        const isRetryable = err?.status === 503 || err?.status === 429 || err?.status === 500 || (err?.message || "").toLowerCase().includes("overload") || (err?.message || "").toLowerCase().includes("unavailable");
        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = attempt * 1200;
          console.warn(`Model ${model} retryable error (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms:`, err?.message);
          await sleep(delay);
          continue;
        }
        console.warn(`Model ${model} failed permanently (attempt ${attempt}):`, err?.message || err);
        break;
      }
    }
  }
  throw lastError || new Error("Todos os modelos de IA do Gemini est\xE3o temporariamente indispon\xEDveis.");
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/ai/parse-transaction", async (req, res) => {
  try {
    const { text, imageBase64, mimeType, audioBase64, audioMimeType } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      return res.json({
        success: true,
        data: {
          description: text || "Despesa Lan\xE7ada",
          amount: 50,
          type: "DESPESA",
          category: "Alimenta\xE7\xE3o",
          date: today,
          paymentMethod: "PIX",
          status: "Pago",
          confidence: 0.8,
          notes: "Identificado via fallback local",
          rawTranscription: text || "Lan\xE7amento manual/sem API Key"
        }
      });
    }
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const systemPrompt = `Voc\xEA \xE9 um assistente financeiro especialista em extra\xE7\xE3o e estrutura\xE7\xE3o de transa\xE7\xF5es financeiras pessoais (receitas e despesas) para o Brasil.
A data de hoje de refer\xEAncia \xE9: ${todayStr}.

Analise o conte\xFAdo fornecido (que pode ser uma grava\xE7\xE3o de \xE1udio, imagem de cupom fiscal/nota/rascunho/PIX, ou texto digitado).
Sua tarefa \xE9 extrair com extrema precis\xE3o os dados financeiros e retornar SEMPRE um JSON v\xE1lido no formato especificado.

Regras de extra\xE7\xE3o:
1. "description": Nome claro e conciso do estabelecimento ou item (Ex: "Supermercado Carrefour", "Almo\xE7o Restaurante", "Uber corrida", "Sal\xE1rio Empresa X", "Farm\xE1cia Droga Raia").
2. "amount": Valor num\xE9rico positivo em Reais (Ex: 45.90). Se houver desconto ou total, use o valor final pago.
3. "type": "DESPESA" ou "RECEITA". Se for gasto/compra/pagamento \xE9 "DESPESA". Se for recebimento/sal\xE1rio/freelance/venda/rendimento \xE9 "RECEITA".
4. "category": Escolha EXATAMENTE uma das seguintes categorias padr\xE3o:
   - "Alimenta\xE7\xE3o" (restaurantes, lanches, delivery, caf\xE9)
   - "Supermercado" (compras de mercado, hortifruti, padaria)
   - "Transporte" (uber, gasolina, \xF4nibus, metr\xF4, estacionamento, ped\xE1gio)
   - "Moradia & Contas" (aluguel, condom\xEDnio, luz, \xE1gua, g\xE1s, internet)
   - "Sa\xFAde & Farm\xE1cia" (rem\xE9dios, consultas, exames, academia)
   - "Lazer & Viagens" (cinema, passeios, viagens, shows, bares)
   - "Educa\xE7\xE3o" (cursos, livros, mensalidade escolar)
   - "Compras & Vestu\xE1rio" (roupas, eletr\xF4nicos, compras online)
   - "Assinaturas & Tech" (netflix, spotify, software, nuvem)
   - "Sal\xE1rio & Renda" (sal\xE1rio, adiantamento)
   - "Freelance & Servi\xE7os" (bicos, projetos, consultorias)
   - "Investimentos & Dividendos" (rendimentos, juros, dividendos)
   - "Outros"
5. "date": Data da transa\xE7\xE3o no formato "YYYY-MM-DD". Se o cupom/\xE1udio indicar uma data espec\xEDfica, use-a. Se o usu\xE1rio disser "ontem", "anteontem", calcule relativo a ${todayStr}. Se n\xE3o especificado, use ${todayStr}.
6. "paymentMethod": Um de: "PIX", "Cart\xE3o de Cr\xE9dito", "Cart\xE3o de D\xE9bito", "Dinheiro", "Boleto", "Transfer\xEAncia", "Outro".
7. "status": "Pago" (padr\xE3o para compras j\xE1 realizadas) ou "Pendente" (se for boleto a vencer, conta futura, etc.).
8. "notes": Resumo \xFAtil dos itens principais ou CNPJ/detalhes observados.
9. "rawTranscription": A transcri\xE7\xE3o exata do que foi dito no \xE1udio ou do texto principal leg\xEDvel na imagem/nota.
10. "confidence": N\xFAmero entre 0.0 e 1.0 indicando a certeza da extra\xE7\xE3o.
11. Se o texto, \xE1udio ou imagem contiver M\xDALTIPLAS transa\xE7\xF5es distintas ou uma lista de gastos (ex: "Gastei 30 na padaria, 150 no mercado e 45 no uber"), preencha o campo "multipleTransactions" com um array contendo cada uma das transa\xE7\xF5es extra\xEDdas, com seus respectivos valores, descri\xE7\xF5es e categorias ("Alimenta\xE7\xE3o", "Supermercado", "Transporte", "Moradia & Contas", "Sa\xFAde & Farm\xE1cia", "Lazer & Viagens", "Educa\xE7\xE3o", "Compras & Vestu\xE1rio", "Assinaturas & Tech", "Sal\xE1rio & Renda", "Freelance & Servi\xE7os", "Investimentos & Dividendos", "Outros"). Al\xE9m disso, defina "suggestedAction" como "multiple".

Responda APENAS com o objeto JSON estruturado. Sem markdown extra ou explica\xE7\xF5es.`;
    const contents = [];
    if (audioBase64) {
      const media = cleanMediaPayload(audioBase64, audioMimeType, "audio/webm");
      if (media) {
        contents.push({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data
          }
        });
        contents.push({
          text: `Por favor, escute este \xE1udio do usu\xE1rio, transcreva o que foi falado e extraia a transa\xE7\xE3o financeira em JSON. Se o usu\xE1rio estiver fazendo uma pergunta sobre gastos, indique no notes ou categorization. Texto adicional se houver: ${text || ""}`
        });
      }
    } else if (imageBase64) {
      const media = cleanMediaPayload(imageBase64, mimeType, "image/jpeg");
      if (media) {
        contents.push({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data
          }
        });
        contents.push({
          text: `Por favor, analise este comprovante fiscal / nota / rascunho / recibo / tela de pagamento banc\xE1rio, extraia os valores, data, estabelecimento e classifique a transa\xE7\xE3o em JSON. Texto adicional fornecido pelo usu\xE1rio: ${text || "Nenhum"}`
        });
      }
    } else {
      contents.push({
        text: `Analise este texto financeiro do usu\xE1rio e extraia a transa\xE7\xE3o em JSON: "${text || ""}"`
      });
    }
    const response = await generateContentWithFallback(ai, {
      contents,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });
    const responseText = response.text || "{}";
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (err) {
      console.error("Failed to parse Gemini response as JSON:", responseText);
      parsedData = {
        description: text || "Transa\xE7\xE3o",
        amount: 0,
        type: "DESPESA",
        category: "Outros",
        date: todayStr,
        paymentMethod: "PIX",
        status: "Pago",
        notes: responseText,
        confidence: 0.5
      };
    }
    return res.json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error("Error in /api/ai/parse-transaction:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao processar transa\xE7\xE3o com IA"
    });
  }
});
app.post("/api/ai/chat", async (req, res) => {
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
      imageMimeType
    } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        reply: `Ol\xE1! Sou seu Assistente Financeiro IA. Notei que sua chave do Gemini ainda n\xE3o foi configurada no ambiente. Mas voc\xEA j\xE1 pode usar a interface e sincronizar com seu Google Sheets! Para respostas completas e consultoria inteligente com IA, ative sua chave GEMINI_API_KEY.`
      });
    }
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const summaryText = financialSummary ? `Resumo Geral Atual:
- Total de Receitas: R$ ${financialSummary.totalIncome?.toFixed(2) || "0.00"}
- Total de Despesas: R$ ${financialSummary.totalExpenses?.toFixed(2) || "0.00"}
- Saldo L\xEDquido: R$ ${financialSummary.balance?.toFixed(2) || "0.00"}
- Total de Transa\xE7\xF5es: ${financialSummary.transactionCount || 0}` : "Sem resumo dispon\xEDvel";
    const recentTxList = Array.isArray(transactionsContext) && transactionsContext.length > 0 ? transactionsContext.slice(0, 150).map(
      (t) => `- [${t.date}] ${t.type}: ${t.description} | R$ ${Number(t.amount).toFixed(2)} | Categoria: ${t.category} | Pagamento: ${t.paymentMethod || "N/A"} | Status: ${t.status || "Pago"}`
    ).join("\n") : "Nenhuma transa\xE7\xE3o cadastrada ainda.";
    const budgetText = Array.isArray(budgetGoals) && budgetGoals.length > 0 ? budgetGoals.map((b) => `- Meta para ${b.category}: Limite R$ ${b.limit}`).join("\n") : "Nenhuma meta de or\xE7amento definida.";
    const systemPrompt = `Voc\xEA \xE9 o "Assistente Financeiro IA", um copiloto de intelig\xEAncia financeira pessoal altamente inteligente, emp\xE1tico, proativo e organizado, especializado na realidade brasileira (BRL, PIX, cart\xF5es, notas fiscais e Google Sheets).
Data de refer\xEAncia hoje: ${todayStr}.

Seu objetivo:
1. Auxiliar o usu\xE1rio a organizar seu dinheiro, controlar gastos, poupar e tirar d\xFAvidas sobre a sua vida financeira.
2. Analisar as transa\xE7\xF5es registradas na planilha/aplicativo para responder com n\xFAmeros EXATOS e precisos (ex: "Quanto gastei em alimenta\xE7\xE3o?", "Qual foi minha maior despesa?", "Como est\xE1 meu saldo?").
3. Dar conselhos pr\xE1ticos e construtivos de finan\xE7as pessoais (regra 50-30-20, corte de sup\xE9rfluos, reserva de emerg\xEAncia).
4. Identificar lan\xE7amentos de gastos ou ganhos quando o usu\xE1rio pedir em \xE1udio, imagem ou texto.

Contexto Financeiro Atual do Usu\xE1rio:
${summaryText}

Metas de Or\xE7amento:
${budgetText}

\xDAltimas Transa\xE7\xF5es Registradas na Planilha:
${recentTxList}

Instru\xE7\xF5es Especiais de Formata\xE7\xE3o e A\xE7\xE3o:
- Sempre use formata\xE7\xE3o em Real brasileiro (R$ 1.250,00).
- Seja direto, claro, encorajador e amig\xE1vel.
- Se o usu\xE1rio pedir para lan\xE7ar um novo gasto/receita ou enviar uma lista com V\xC1RIOS gastos (ex: "Gastei 150 no mercado, 30 de uber e 40 na farm\xE1cia"), categorize cada item separadamente e inclua no FINAL da sua resposta o seguinte bloco especial para o sistema processar a a\xE7\xE3o (se houver m\xFAltiplos itens, inclua o array "multipleTransactions" com cada item categorizado):
[ACTION_PROPOSE_TRANSACTION: {"description": "Resumo da lista ou item principal", "amount": 0.00, "type": "DESPESA"|"RECEITA", "category": "...", "date": "${todayStr}", "paymentMethod": "PIX"|"Cart\xE3o de Cr\xE9dito"|"Cart\xE3o de D\xE9bito"|"Dinheiro"|"Boleto"|"Outro", "status": "Pago", "multipleTransactions": [{"description": "...", "amount": 0.00, "type": "DESPESA", "category": "...", "date": "${todayStr}", "paymentMethod": "PIX", "status": "Pago"}]}]
- Sugira 2 a 3 perguntas r\xE1pidas no final como sugest\xE3o em formato:
[SUGGESTED_CHIPS: ["Pergunta 1", "Pergunta 2", "Pergunta 3"]]`;
    const contents = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }]
        });
      }
    }
    const currentParts = [];
    if (audioBase64) {
      const media = cleanMediaPayload(audioBase64, audioMimeType, "audio/webm");
      if (media) {
        currentParts.push({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data
          }
        });
        currentParts.push({
          text: `[O usu\xE1rio enviou uma grava\xE7\xE3o de voz]: "${message || "Por favor, processe meu \xE1udio e responda"}"`
        });
      }
    } else if (imageBase64) {
      const media = cleanMediaPayload(imageBase64, imageMimeType, "image/jpeg");
      if (media) {
        currentParts.push({
          inlineData: {
            mimeType: media.mimeType,
            data: media.data
          }
        });
        currentParts.push({
          text: `[O usu\xE1rio enviou uma foto/imagem de nota ou comprovante]: "${message || "Analise esta imagem financeira para mim"}"`
        });
      }
    } else {
      currentParts.push({
        text: message
      });
    }
    contents.push({
      role: "user",
      parts: currentParts
    });
    const response = await generateContentWithFallback(ai, {
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4
      }
    });
    const rawText = response.text || "Desculpe, n\xE3o consegui processar a resposta no momento.";
    let cleanReply = rawText;
    let proposedTransaction = null;
    let suggestedChips = [];
    const actionMatch = rawText.match(/\[ACTION_PROPOSE_TRANSACTION:\s*({[\s\S]*?})\]/);
    if (actionMatch) {
      try {
        proposedTransaction = JSON.parse(actionMatch[1]);
        cleanReply = cleanReply.replace(actionMatch[0], "").trim();
      } catch (e) {
        console.error("Failed to parse proposed transaction:", e);
      }
    }
    const chipsMatch = rawText.match(/\[SUGGESTED_CHIPS:\s*(\[[\s\S]*?\])\]/);
    if (chipsMatch) {
      try {
        suggestedChips = JSON.parse(chipsMatch[1]);
        cleanReply = cleanReply.replace(chipsMatch[0], "").trim();
      } catch (e) {
        console.error("Failed to parse suggested chips:", e);
      }
    }
    return res.json({
      success: true,
      reply: cleanReply,
      proposedTransaction,
      suggestedChips: suggestedChips.length > 0 ? suggestedChips : [
        "Quanto gastei este m\xEAs?",
        "Resumo por categorias",
        "Como posso economizar?"
      ]
    });
  } catch (error) {
    console.error("Error in /api/ai/chat:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro ao comunicar com o assistente IA"
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Financial AI Assistant server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
