import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  X,
  Send,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Edit3,
} from 'lucide-react';
import { AudioRecorderManager } from '../services/audioRecorder';
import { parseFinancialTransactionWithAI } from '../services/geminiService';
import { ParsedTransactionResult } from '../types';
import { formatCurrencyBRL, formatDateBR } from '../constants/categories';

interface AudioInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTransaction: (parsedTx: ParsedTransactionResult, source: 'audio') => Promise<void>;
  sheetConnected: boolean;
}

export const AudioInputModal: React.FC<AudioInputModalProps> = ({
  isOpen,
  onClose,
  onConfirmTransaction,
  sheetConnected,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedTransactionResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recorderRef = useRef<AudioRecorderManager | null>(null);
  const timerRef = useRef<any>(null);
  const animFrameRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setParsedResult(null);
      setErrorMsg(null);
      setDuration(0);
      setIsAnalyzing(false);
      setAudioUrl(null);
      // Auto-start recording on open
      startRecording();
    } else {
      stopAndCleanup();
    }
    return () => {
      stopAndCleanup();
    };
  }, [isOpen]);

  const startRecording = async () => {
    try {
      setErrorMsg(null);
      const recorder = new AudioRecorderManager();
      await recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      // Volume visualizer loop
      const updateVolume = () => {
        if (recorderRef.current && isRecording) {
          const vol = recorderRef.current.getVolume();
          setVolumeLevel(vol);
          animFrameRef.current = requestAnimationFrame(updateVolume);
        }
      };
      animFrameRef.current = requestAnimationFrame(updateVolume);
    } catch (err: any) {
      console.error('Audio start error:', err);
      setErrorMsg('Não foi possível acessar o microfone. Verifique as permissões.');
      setIsRecording(false);
    }
  };

  const handleStopAndAnalyze = async () => {
    if (!recorderRef.current) return;
    clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsRecording(false);
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const { base64, mimeType, blob } = await recorderRef.current.stop();
      recorderRef.current = null;
      setAudioUrl(URL.createObjectURL(blob));

      const result = await parseFinancialTransactionWithAI({
        audioBase64: base64,
        audioMimeType: mimeType,
      });

      setParsedResult(result);
    } catch (err: any) {
      console.error('Audio analyze error:', err);
      setErrorMsg(err.message || 'Não foi possível interpretar o áudio. Tente falar mais perto do microfone.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stopAndCleanup = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsRecording(false);
  };

  const handleConfirm = async () => {
    if (!parsedResult) return;
    try {
      await onConfirmTransaction(parsedResult, 'audio');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar transação');
    }
  };

  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold border border-purple-500/30">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-zinc-100">Lançamento por Voz</h2>
              <p className="text-[11px] text-zinc-400">A IA transcreve e extrai os dados automaticamente</p>
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
        <div className="p-6 text-center space-y-5">
          {/* Visual State: Recording */}
          {isRecording && (
            <div className="space-y-4 py-4">
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                {/* Pulsing rings */}
                <div
                  className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"
                  style={{ animationDuration: '1.5s' }}
                />
                <div
                  className="absolute inset-2 rounded-full bg-rose-500/30"
                  style={{ transform: `scale(${1 + volumeLevel * 0.5})`, transition: 'transform 0.1s ease-out' }}
                />
                <button
                  onClick={handleStopAndAnalyze}
                  className="relative z-10 w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                >
                  <Mic className="w-7 h-7" />
                </button>
              </div>

              <div>
                <span className="text-xl font-bold text-slate-900 font-mono">
                  {formatTimer(duration)}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Ouvindo... Diga: <em>"Gastei 45 reais na padaria no débito"</em>
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={handleStopAndAnalyze}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Concluir e Analisar
                </button>
              </div>
            </div>
          )}

          {/* Visual State: Analyzing */}
          {isAnalyzing && (
            <div className="py-8 space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">IA Transcrevendo e Estruturando...</h3>
              <p className="text-xs text-slate-500">
                Extraindo valor, categoria, estabelecimento e data
              </p>
            </div>
          )}

          {/* Visual State: Extracted Transaction Result */}
          {parsedResult && !isAnalyzing && (
            <div className="space-y-4 text-left animate-fadeIn">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Transação extraída com sucesso pelo Gemini!</span>
              </div>

              {parsedResult.rawTranscription && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                    Transcrição do Áudio:
                  </span>
                  <em>"{parsedResult.rawTranscription}"</em>
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-slate-500">Tipo:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full ${
                      parsedResult.type === 'RECEITA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {parsedResult.type}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-slate-500">Descrição:</span>
                  <span className="font-bold text-slate-900">{parsedResult.description}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-slate-500">Valor:</span>
                  <span className="font-extrabold text-sm text-slate-900">
                    {formatCurrencyBRL(parsedResult.amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-slate-500">Categoria:</span>
                  <span className="font-semibold text-slate-800">{parsedResult.category}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-slate-500">Data:</span>
                  <span className="text-slate-700">{formatDateBR(parsedResult.date)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500">Pagamento:</span>
                  <span className="text-slate-700">{parsedResult.paymentMethod}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Gravar Novamente
                </button>
                <button
                  id="btn-confirm-audio-tx"
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Salvar na Planilha</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
