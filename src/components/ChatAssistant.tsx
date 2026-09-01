import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Loader2,
  Trash2,
  FileSpreadsheet,
  Paperclip,
  X,
  Volume2,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  ChatMessage,
  Transaction,
  FinancialSummary,
  BudgetGoal,
  ParsedTransactionResult,
  SheetConfig,
} from '../types';
import { sendChatMessageToAI } from '../services/geminiService';
import { AudioRecorderManager } from '../services/audioRecorder';
import { formatCurrencyBRL, formatDateBR, getCategoryMeta } from '../constants/categories';

interface ChatAssistantProps {
  transactions: Transaction[];
  summary: FinancialSummary;
  budgetGoals: BudgetGoal[];
  sheetConfig: SheetConfig;
  onAddTransaction: (tx: ParsedTransactionResult, source: 'audio' | 'image' | 'text') => Promise<void>;
  onOpenEditModal: (tx: ParsedTransactionResult) => void;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  themeMode?: 'black' | 'light';
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  transactions,
  summary,
  budgetGoals,
  sheetConfig,
  onAddTransaction,
  onOpenEditModal,
  initialPrompt,
  onClearInitialPrompt,
  themeMode = 'black',
}) => {
  const isBlack = themeMode === 'black';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Olá! Sou seu **Assistente Financeiro IA** 🤖✨.\n\nVocê pode me mandar mensagens de texto, **gravar áudio** com seus gastos ou **anexar fotos de notas e cupons fiscais**! Também posso analisar seu extrato e sugerir metas de economia.\n\n*Exemplo: "Gastei 45 no almoço no PIX hoje" ou "Quanto gastei com alimentação este mês?"*',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      suggestedChips: [
        'Quanto gastei com Alimentação?',
        'Qual meu saldo atual?',
        'Lançar despesa por áudio',
        'Conselhos para economizar',
      ],
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [attachedImage, setAttachedImage] = useState<{
    base64: string;
    mimeType: string;
    preview: string;
    name: string;
  } | null>(null);

  const audioRecorderRef = useRef<AudioRecorderManager | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle initial prompt from parent
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0) {
      handleSendMessage(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  // Start Voice Recording
  const handleStartRecording = async () => {
    try {
      const recorder = new AudioRecorderManager();
      await recorder.start();
      audioRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting audio recording:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões no navegador.');
    }
  };

  // Stop & Process Voice Recording
  const handleStopRecording = async () => {
    if (!audioRecorderRef.current) return;
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    try {
      setIsLoading(true);
      const audioResult = await audioRecorderRef.current.stop();
      audioRecorderRef.current = null;

      const userMessageId = `msg-${Date.now()}`;
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Add user message with audio
      const newMessages: ChatMessage[] = [
        ...messages,
        {
          id: userMessageId,
          role: 'user',
          content: '🎙️ [Gravação de voz enviada]',
          timestamp: nowTime,
          mediaType: 'audio',
          audioBlob: audioResult.base64,
        },
      ];
      setMessages(newMessages);

      // Call AI endpoint for Audio
      const chatHistory = newMessages.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

      const aiResponse = await sendChatMessageToAI({
        message: 'Por favor, processe esta gravação de áudio.',
        history: chatHistory,
        transactionsContext: transactions,
        financialSummary: summary,
        budgetGoals: budgetGoals,
        audioBase64: audioResult.base64,
        audioMimeType: audioResult.mimeType,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: aiResponse.reply,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          parsedTransaction: aiResponse.proposedTransaction || undefined,
          suggestedChips: aiResponse.suggestedChips,
        },
      ]);
    } catch (err: any) {
      console.error('Error processing audio in chat:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `Desculpe, ocorreu um erro ao transcrever o áudio com IA: ${err.message || 'Tente novamente.'}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setRecordingDuration(0);
    }
  };

  const handleCancelRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
      audioRecorderRef.current = null;
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Image Upload Handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAttachedImage({
        base64,
        mimeType: file.type || 'image/jpeg',
        preview: URL.createObjectURL(file),
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Send Message (Text + optional Image)
  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride !== undefined ? textOverride : inputMessage;
    if (!textToSend.trim() && !attachedImage) return;

    const currentImg = attachedImage;
    setInputMessage('');
    setAttachedImage(null);
    setIsLoading(true);

    const userMessageId = `msg-${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: textToSend || (currentImg ? '📸 Analise esta foto/comprovante' : ''),
      timestamp: nowTime,
      mediaType: currentImg ? 'image' : 'text',
      mediaPreview: currentImg?.preview,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      const chatHistory = newMessages.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

      const aiResponse = await sendChatMessageToAI({
        message: textToSend,
        history: chatHistory,
        transactionsContext: transactions,
        financialSummary: summary,
        budgetGoals: budgetGoals,
        imageBase64: currentImg?.base64,
        imageMimeType: currentImg?.mimeType,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: aiResponse.reply,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          parsedTransaction: aiResponse.proposedTransaction || undefined,
          suggestedChips: aiResponse.suggestedChips,
        },
      ]);
    } catch (err: any) {
      console.error('Error in sendChatMessageToAI:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `Desculpe, ocorreu um erro ao consultar o assistente: ${err.message || 'Tente novamente.'}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm proposed transaction card directly to cloud
  const handleConfirmProposedTransaction = async (msgId: string, parsedTx: ParsedTransactionResult) => {
    try {
      await onAddTransaction(parsedTx, 'text');
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isActionExecuted: true } : m))
      );
    } catch (err: any) {
      alert(`Erro ao salvar na nuvem: ${err.message}`);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-12rem)] min-h-[550px] rounded-3xl border shadow-xl overflow-hidden transition-colors ${
      isBlack ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* Chat Header */}
      <div className={`p-4 border-b flex items-center justify-between transition-colors ${
        isBlack ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-bold text-sm ${isBlack ? 'text-white' : 'text-slate-900'}`}>Finance IA Assistente</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Gemini Ativo
              </span>
            </div>
            <p className={`text-xs ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>
              Áudio, Fotos de Notas &amp; Consultas Inteligentes
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: `reset-${Date.now()}`,
                role: 'assistant',
                content: 'Histórico reiniciado. Como posso te auxiliar agora nas suas finanças?',
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            isBlack ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
          }`}
          title="Limpar conversa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-sm'
                    : 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-emerald-700 to-teal-700 text-white rounded-tr-xs shadow-md'
                      : isBlack
                      ? 'bg-zinc-800/90 text-zinc-100 rounded-tl-xs border border-zinc-700 shadow-md'
                      : 'bg-slate-100 text-slate-900 rounded-tl-xs border border-slate-200 shadow-xs'
                  }`}
                >
                  {/* Media preview */}
                  {msg.mediaPreview && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-white/20 max-h-56">
                      <img
                        src={msg.mediaPreview}
                        alt="Comprovante enviado"
                        className="w-full h-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Audio info */}
                  {msg.audioBlob && (
                    <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/20 text-xs font-mono">
                      <Volume2 className="w-4 h-4 text-emerald-300 animate-pulse" />
                      <span>Áudio enviado com sucesso</span>
                    </div>
                  )}

                  {/* Markdown */}
                  <div className="markdown-body prose prose-sm max-w-none prose-p:my-1 prose-headings:my-1.5 prose-strong:text-inherit">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  <div className={`mt-2 text-[10px] text-right ${isUser ? 'text-emerald-200' : isBlack ? 'text-zinc-500' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {/* Proposed Transaction Action Card */}
                {msg.parsedTransaction && (
                  <div className={`border-2 border-emerald-500/80 rounded-2xl p-4 shadow-lg space-y-3 animate-fade-in ${
                    isBlack ? 'bg-zinc-950 text-white' : 'bg-white text-slate-900'
                  }`}>
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {msg.parsedTransaction.type === 'RECEITA' ? (
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-rose-400" />
                          )}
                        </div>
                        <div>
                          <span className={`text-xs font-bold ${isBlack ? 'text-white' : 'text-slate-900'}`}>
                            {msg.parsedTransaction.type === 'RECEITA' ? 'Receita Identificada' : 'Despesa Identificada'}
                          </span>
                          <span className="text-[10px] block text-emerald-400 font-semibold">
                            Pronta para salvar na nuvem
                          </span>
                        </div>
                      </div>

                      <span className="text-sm font-extrabold text-emerald-400">
                        {formatCurrencyBRL(msg.parsedTransaction.amount)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className={`text-[11px] block ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>Descrição</span>
                        <span className={`font-bold ${isBlack ? 'text-zinc-100' : 'text-slate-800'}`}>{msg.parsedTransaction.description}</span>
                      </div>
                      <div>
                        <span className={`text-[11px] block ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>Categoria</span>
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
                          {msg.parsedTransaction.category}
                        </span>
                      </div>
                      <div>
                        <span className={`text-[11px] block ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>Data</span>
                        <span className={`font-semibold ${isBlack ? 'text-zinc-200' : 'text-slate-700'}`}>{formatDateBR(msg.parsedTransaction.date)}</span>
                      </div>
                      <div>
                        <span className={`text-[11px] block ${isBlack ? 'text-zinc-400' : 'text-slate-500'}`}>Pagamento</span>
                        <span className={`font-semibold ${isBlack ? 'text-zinc-200' : 'text-slate-700'}`}>{msg.parsedTransaction.paymentMethod}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {msg.isActionExecuted ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/60 text-emerald-300 text-xs font-bold border border-emerald-800/80">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Lançado e salvo com sucesso!</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleConfirmProposedTransaction(msg.id, msg.parsedTransaction!)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirmar Lançamento</span>
                        </button>
                        <button
                          onClick={() => onOpenEditModal(msg.parsedTransaction!)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                            isBlack
                              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggested Chips */}
                {msg.suggestedChips && msg.suggestedChips.length > 0 && !isLoading && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestedChips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(chip)}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium ${
                          isBlack
                            ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700/80'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-xs'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700 flex items-center justify-center text-xs">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className={`p-4 rounded-2xl rounded-tl-xs text-xs flex items-center gap-2 border ${
              isBlack ? 'bg-zinc-800/90 text-zinc-300 border-zinc-700' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>O Gemini está pensando e estruturando suas finanças...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`p-3 sm:p-4 border-t transition-colors ${
        isBlack ? 'bg-zinc-950/90 border-zinc-800' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Attached image preview */}
        {attachedImage && (
          <div className={`mb-3 p-2 rounded-2xl flex items-center justify-between gap-3 border ${
            isBlack ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={attachedImage.preview}
                alt="Nota Fiscal"
                className="w-10 h-10 object-cover rounded-xl border border-zinc-700"
              />
              <div className="truncate text-xs">
                <span className={`font-bold block truncate ${isBlack ? 'text-zinc-200' : 'text-slate-800'}`}>{attachedImage.name}</span>
                <span className="text-[10px] text-emerald-400">Pronto para leitura por IA</span>
              </div>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1 text-zinc-400 hover:text-rose-400 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Recording active bar */}
        {isRecording ? (
          <div className="flex items-center justify-between bg-rose-950/80 border border-rose-800/80 p-3 rounded-2xl animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
              <span className="text-xs font-bold text-rose-200">
                Gravando áudio... {formatTimer(recordingDuration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelRecording}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleStopRecording}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <MicOff className="w-3.5 h-3.5" />
                <span>Enviar Áudio</span>
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Attach Image Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar foto de comprovante ou nota"
              className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
                isBlack
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border-zinc-800'
                  : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-emerald-600 border-slate-200 shadow-xs'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleStartRecording}
              title="Gravar despesa por áudio"
              className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
                isBlack
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border-zinc-800'
                  : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-emerald-600 border-slate-200 shadow-xs'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Digite um gasto, dúvida ou peça conselho financeiro..."
              className={`flex-1 py-2.5 px-4 rounded-2xl text-xs sm:text-sm border outline-none transition-colors ${
                isBlack
                  ? 'bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-emerald-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 shadow-xs'
              }`}
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || (!inputMessage.trim() && !attachedImage)}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
