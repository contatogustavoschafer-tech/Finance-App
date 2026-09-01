import React, { useState, useRef } from 'react';
import {
  Receipt,
  Upload,
  Camera,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { parseFinancialTransactionWithAI } from '../services/geminiService';
import { ParsedTransactionResult } from '../types';
import { formatCurrencyBRL, formatDateBR } from '../constants/categories';

interface ImageReceiptScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTransaction: (parsedTx: ParsedTransactionResult, source: 'image') => Promise<void>;
  sheetConnected: boolean;
}

export const ImageReceiptScanner: React.FC<ImageReceiptScannerProps> = ({
  isOpen,
  onClose,
  onConfirmTransaction,
  sheetConnected,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedTransactionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setErrorMsg(null);
    setParsedResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImagePreview(URL.createObjectURL(file));
      setImageBase64(base64);
      setMimeType(file.type || 'image/jpeg');

      // Automatically trigger AI analysis
      analyzeReceipt(base64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const analyzeReceipt = async (base64Data: string, type: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const result = await parseFinancialTransactionWithAI({
        imageBase64: base64Data,
        mimeType: type,
      });
      setParsedResult(result);
    } catch (err: any) {
      console.error('Error analyzing receipt:', err);
      setErrorMsg(err.message || 'Falha ao analisar comprovante fiscal com a IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedResult) return;
    try {
      await onConfirmTransaction(parsedResult, 'image');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar transação.');
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setImageBase64(null);
    setParsedResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold border border-blue-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-zinc-100">Escanear Cupom ou Comprovante</h2>
              <p className="text-[11px] text-zinc-400">
                Envie foto de notas fiscais, recibos, comprovantes PIX ou anotações
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
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Upload Area if no image selected */}
          {!imagePreview ? (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {/* Drag & Drop Card */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    Clique para selecionar ou arraste o comprovante
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Suporta PNG, JPG, JPEG de cupons fiscais, recibos e notas
                  </p>
                </div>
              </div>

              {/* Camera Trigger */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
                >
                  <Camera className="w-4 h-4 text-slate-600" />
                  <span>Tirar Foto com a Câmera</span>
                </button>
              </div>
            </div>
          ) : (
            /* Image Preview & Extracted details */
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-28 h-36 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 shrink-0 relative group">
                  <img
                    src={imagePreview}
                    alt="Nota fiscal"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    onClick={handleReset}
                    className="absolute top-1 right-1 p-1 bg-slate-900/80 text-white rounded-full hover:bg-slate-900"
                    title="Remover foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Comprovante anexado</span>
                    <button
                      onClick={() => analyzeReceipt(imageBase64!, mimeType)}
                      disabled={isAnalyzing}
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      Reanalisar
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    O Gemini está extraindo itens, total pago, CNPJ/estabelecimento e categoria.
                  </p>
                </div>
              </div>

              {/* Analysis Loading State */}
              {isAnalyzing && (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">Lendo comprovante com visão computacional...</p>
                </div>
              )}

              {/* Extracted Details Card */}
              {parsedResult && !isAnalyzing && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dados Extraídos com Sucesso</span>
                    </div>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full ${
                        parsedResult.type === 'RECEITA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {parsedResult.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Estabelecimento</span>
                      <span className="font-bold text-slate-900">{parsedResult.description}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Valor Total</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {formatCurrencyBRL(parsedResult.amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Categoria</span>
                      <span className="font-semibold text-slate-800">{parsedResult.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Data da Compra</span>
                      <span className="font-medium text-slate-700">{formatDateBR(parsedResult.date)}</span>
                    </div>
                  </div>

                  {parsedResult.notes && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-slate-500 text-[11px] block">Itens / Detalhes Identificados:</span>
                      <span className="text-slate-700 text-xs italic">{parsedResult.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Box */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Outra Foto
                </button>
                <button
                  id="btn-confirm-receipt-tx"
                  onClick={handleConfirm}
                  disabled={!parsedResult || isAnalyzing}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Salvar na Planilha</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
