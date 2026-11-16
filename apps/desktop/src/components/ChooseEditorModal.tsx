import React, { useState } from 'react';
import { X, FileText, Table, Edit3, ArrowRight, Laptop, Monitor, AlertCircle } from 'lucide-react';

interface ChooseEditorModalProps {
  documentName: string;
  customerNote?: string;
  onSelectWord: () => void;
  onSelectExcel: () => void;
  onOpenNativeWord?: () => void;
  onOpenNativeExcel?: () => void;
  isElectron?: boolean;
  onClose: () => void;
}

export default function ChooseEditorModal({
  documentName,
  customerNote,
  onSelectWord,
  onSelectExcel,
  onOpenNativeWord,
  onOpenNativeExcel,
  isElectron = false,
  onClose,
}: ChooseEditorModalProps) {
  const lower = documentName.toLowerCase();
  const isSuggestedExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                <Edit3 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Choose Document Editor</h3>
            </div>
            <p className="text-xs text-stone-500">
              Select how you want to edit <span className="text-stone-800 font-semibold truncate inline-block max-w-[280px] align-bottom">"{documentName}"</span>
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

        {/* Section 1: Official Native Desktop Software (Microsoft Office on Windows PC) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
              <Monitor className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Real Desktop Software (Installed on PC)</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Best Quality & Formatting
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Open in Microsoft Word */}
            <button
              type="button"
              onClick={onOpenNativeWord || onSelectWord}
              className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between group cursor-pointer ${
                !isSuggestedExcel
                  ? 'bg-blue-50/80 border-blue-400 hover:bg-blue-100/90 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {!isSuggestedExcel && (
                <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-blue-600 text-white uppercase tracking-wider">
                  Recommended
                </span>
              )}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
                  W
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 group-hover:text-blue-700 transition">
                    Microsoft Word (PC)
                  </h4>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                    Opens directly in desktop MS Word with full layout, fonts, margins & direct Ctrl+P print.
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-stone-200/80 flex items-center justify-between text-[11px] font-bold text-blue-600 group-hover:text-blue-700">
                <span>Launch MS Word</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
              </div>
            </button>

            {/* Open in Microsoft Excel */}
            <button
              type="button"
              onClick={onOpenNativeExcel || onSelectExcel}
              className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between group cursor-pointer ${
                isSuggestedExcel
                  ? 'bg-emerald-50/80 border-emerald-400 hover:bg-emerald-100/90 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {isSuggestedExcel && (
                <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider">
                  Recommended
                </span>
              )}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
                  X
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 group-hover:text-emerald-700 transition">
                    Microsoft Excel (PC)
                  </h4>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                    Opens directly in desktop MS Excel with formulas, cell auto-fit, and grid printing.
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-stone-200/80 flex items-center justify-between text-[11px] font-bold text-emerald-600 group-hover:text-emerald-700">
                <span>Launch MS Excel</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: In-Dashboard Integrated Web Editors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
              <Laptop className="w-3.5 h-3.5 text-stone-600" />
              <span>2. Built-In Dashboard Editor (No MS Office Needed)</span>
            </div>
            <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
              Instant In-Browser
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Built-in Word Clone */}
            <button
              type="button"
              onClick={onSelectWord}
              className="p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-left transition flex items-center justify-between group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-stone-800 text-white flex items-center justify-center text-xs font-bold">
                  W
                </div>
                <div>
                  <h5 className="text-xs font-bold text-stone-900 group-hover:text-blue-600 transition">
                    In-Dashboard Word
                  </h5>
                  <p className="text-[10px] text-stone-500">Quick typos, headings, and paragraphs</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-blue-600 transition" />
            </button>

            {/* Built-in Excel Clone */}
            <button
              type="button"
              onClick={onSelectExcel}
              className="p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-left transition flex items-center justify-between group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-stone-800 text-white flex items-center justify-center text-xs font-bold">
                  X
                </div>
                <div>
                  <h5 className="text-xs font-bold text-stone-900 group-hover:text-emerald-600 transition">
                    In-Dashboard Spreadsheet
                  </h5>
                  <p className="text-[10px] text-stone-500">Grid cells, tables, sums & bill rows</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600 transition" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <p className="text-[11px] text-stone-500">
            {isElectron
              ? '✓ Connected to Windows Desktop Shell'
              : 'Tip: Run counter terminal in Electron for automatic 1-click MS Office launch.'}
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
