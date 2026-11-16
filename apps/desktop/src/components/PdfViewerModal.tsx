import React from 'react';
import { Printer, X, Download, FileText, ExternalLink, RefreshCw } from 'lucide-react';

interface PdfViewerModalProps {
  documentName: string;
  pdfUrl: string | null;
  customerNote?: string;
  isLoading?: boolean;
  onClose: () => void;
  onPrint?: () => void;
}

export default function PdfViewerModal({
  documentName,
  pdfUrl,
  customerNote,
  isLoading,
  onClose,
  onPrint,
}: PdfViewerModalProps) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else if (pdfUrl) {
      const win = window.open(pdfUrl, '_blank');
      if (win) win.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex flex-col">
      {/* Top Title Bar */}
      <div className="h-11 bg-stone-900 text-white flex items-center justify-between px-4 select-none shrink-0 border-b border-stone-800 shadow-md">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
            PDF
          </div>
          <span className="text-xs font-semibold text-white truncate max-w-md">{documentName}</span>
          <span className="text-[11px] text-stone-400 hidden sm:inline">- Official Customer Document Viewer</span>
        </div>

        <div className="flex items-center gap-2">
          {customerNote && (
            <span className="text-[11px] bg-amber-500 text-stone-950 px-2.5 py-0.5 rounded-full font-bold truncate max-w-xs">
              Note: {customerNote}
            </span>
          )}

          {pdfUrl && (
            <a
              href={pdfUrl}
              download={documentName}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-medium transition"
              title="Download to PC"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}

          {pdfUrl && (
            <button
              type="button"
              onClick={() => window.open(pdfUrl, '_blank')}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-medium transition"
              title="Open in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              New Tab
            </button>
          )}

          <button
            type="button"
            disabled={!pdfUrl || isLoading}
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold transition shadow-xs disabled:opacity-50"
            title="Print this PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            Print PDF
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-white transition ml-2"
            title="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Viewer Canvas */}
      <div className="flex-1 bg-stone-900 p-4 flex items-center justify-center overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 text-stone-300">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm font-medium">Reconstructing customer PDF document from Cloud Counter...</p>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            title={documentName}
            className="w-full h-full rounded-lg border border-stone-800 bg-white shadow-2xl"
          />
        ) : (
          <div className="text-center p-8 bg-stone-800/80 rounded-xl border border-stone-700 max-w-md space-y-3">
            <FileText className="w-10 h-10 text-stone-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Document File Data Available</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              This order was placed before live file synchronization was enabled, so its binary PDF data was not transmitted.
            </p>
            <p className="text-xs text-amber-400 font-medium">
              Please submit a new order from your phone via the live QR code to test instant PDF viewing and printing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
