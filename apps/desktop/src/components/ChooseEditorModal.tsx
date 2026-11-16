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
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                <Edit3 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Choose Workstation Editor</h3>
            </div>
            <p className="text-xs text-stone-500">
              Select which editor to open for <span className="text-stone-800 font-semibold truncate inline-block max-w-[280px] align-bottom">"{documentName}"</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {customerNote && (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl flex items-center gap-2">
            <span className="font-bold text-amber-700">Customer Note:</span>
            <span className="truncate">"{customerNote}"</span>
          </div>
        )}

        {/* Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Word Option */}
          <button
            type="button"
            onClick={onSelectWord}
            className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between group cursor-pointer ${
              !isSuggestedExcel
                ? 'bg-blue-50/70 border-blue-400 hover:bg-blue-100/70 ring-1 ring-blue-400/40 shadow-xs'
                : 'bg-stone-50 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
            }`}
          >
            {!isSuggestedExcel && (
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white uppercase tracking-wider shadow-xs">
                Recommended
              </span>
            )}
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                W
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900 group-hover:text-blue-700 transition">Word Document Editor</h4>
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                  Edit text, fix spelling, replace customer addresses, adjust headings and layout on A4 paper.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
              <span>Open in Word</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </button>

          {/* Excel Option */}
          <button
            type="button"
            onClick={onSelectExcel}
            className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between group cursor-pointer ${
              isSuggestedExcel
                ? 'bg-emerald-50/70 border-emerald-400 hover:bg-emerald-100/70 ring-1 ring-emerald-400/40 shadow-xs'
                : 'bg-stone-50 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
            }`}
          >
            {isSuggestedExcel && (
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white uppercase tracking-wider shadow-xs">
                Recommended
              </span>
            )}
            <div className="space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                X
              </div>
              <div>
                <h4 className="text-sm font-bold text-stone-900 group-hover:text-emerald-700 transition">Excel Spreadsheet Editor</h4>
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                  Modify columns, prices, quantities, formulas, and format tabular bill sheets into grid tables.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
              <span>Open in Excel</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <p className="text-[11px] text-stone-500">
            Edits are saved directly to this customer's counter order.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
