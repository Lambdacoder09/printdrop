import React from 'react';
import { X, FileText, Table, Edit3, ArrowRight } from 'lucide-react';

interface ChooseEditorModalProps {
  documentName: string;
  customerNote?: string;
  onSelectWord: () => void;
  onSelectExcel: () => void;
  onClose: () => void;
}

export default function ChooseEditorModal({
  documentName,
  customerNote,
  onSelectWord,
  onSelectExcel,
  onClose,
}: ChooseEditorModalProps) {
  const lower = documentName.toLowerCase();
  const isSuggestedExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-orange-600/20 text-orange-400 flex items-center justify-center">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-base font-bold text-white">Choose Workstation Editor</h3>
            </div>
            <p className="text-xs text-stone-400">
              Select which editor to open for <span className="text-stone-200 font-semibold truncate inline-block max-w-[280px] align-bottom">"{documentName}"</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {customerNote && (
          <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 px-3 py-2 rounded-xl flex items-center gap-2">
            <span className="font-semibold text-amber-400">Customer Note:</span>
            <span className="truncate">"{customerNote}"</span>
          </div>
        )}

        {/* Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Word Option */}
          <button
            type="button"
            onClick={onSelectWord}
            className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between group ${
              !isSuggestedExcel
                ? 'bg-blue-950/40 border-blue-600/80 hover:bg-blue-950/70 hover:border-blue-500 ring-1 ring-blue-500/30'
                : 'bg-stone-800/60 border-stone-700 hover:bg-stone-800 hover:border-stone-600'
            }`}
          >
            {!isSuggestedExcel && (
              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                Recommended
              </span>
            )}
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                W
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition">Word Document Editor</h4>
                <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                  Edit text, fix spelling, replace customer addresses, adjust headings and layout on A4 paper.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-700/50 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
              <span>Open in Word</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </button>

          {/* Excel Option */}
          <button
            type="button"
            onClick={onSelectExcel}
            className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between group ${
              isSuggestedExcel
                ? 'bg-emerald-950/40 border-emerald-600/80 hover:bg-emerald-950/70 hover:border-emerald-500 ring-1 ring-emerald-500/30'
                : 'bg-stone-800/60 border-stone-700 hover:bg-stone-800 hover:border-stone-600'
            }`}
          >
            {isSuggestedExcel && (
              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                Recommended
              </span>
            )}
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                X
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">Excel Spreadsheet Editor</h4>
                <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                  Modify columns, prices, quantities, formulas, and format tabular bill sheets into grid tables.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-700/50 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
              <span>Open in Excel</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-stone-500">
            Edits are saved directly to this customer's counter order.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
