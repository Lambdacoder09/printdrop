import React, { useState, useRef } from 'react';
import {
  Printer,
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Save,
  FileText,
  Table as TableIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface DocEditorModalProps {
  documentName: string;
  initialContent?: string;
  customerNote?: string;
  onClose: () => void;
  onSave?: (content: string) => void;
}

export default function DocEditorModal({
  documentName,
  initialContent,
  customerNote,
  onClose,
  onSave,
}: DocEditorModalProps) {
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'insert' | 'layout'>('home');
  const [zoom, setZoom] = useState(100);
  const editorRef = useRef<HTMLDivElement>(null);

  const applyFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleInsertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <thead>
          <tr>
            <th style="border: 1px solid #999; padding: 6px; background: #f3f3f3;">Item</th>
            <th style="border: 1px solid #999; padding: 6px; background: #f3f3f3;">Description</th>
            <th style="border: 1px solid #999; padding: 6px; background: #f3f3f3;">Qty</th>
            <th style="border: 1px solid #999; padding: 6px; background: #f3f3f3;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #999; padding: 6px;">1</td>
            <td style="border: 1px solid #999; padding: 6px;">Document Service</td>
            <td style="border: 1px solid #999; padding: 6px;">1</td>
            <td style="border: 1px solid #999; padding: 6px;">100.00</td>
          </tr>
        </tbody>
      </table>
    `;
    applyFormat('insertHTML', tableHtml);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex flex-col">
      {/* Top Title Bar */}
      <div className="h-10 bg-blue-900 text-white flex items-center justify-between px-4 select-none shrink-0 border-b border-blue-950">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-700 flex items-center justify-center font-bold text-xs">
            W
          </div>
          <span className="text-xs font-semibold">{documentName}</span>
          <span className="text-[11px] text-blue-200">- Word Document Editor (Shop Workstation)</span>
        </div>

        <div className="flex items-center gap-2">
          {customerNote && (
            <span className="text-[11px] bg-amber-500 text-stone-950 px-2 py-0.5 rounded font-bold">
              Customer Note: {customerNote}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-blue-800 rounded text-blue-200 hover:text-white"
            title="Close editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ribbon Navigation */}
      <div className="bg-stone-100 border-b border-stone-300 text-stone-800 select-none shrink-0">
        <div className="flex border-b border-stone-200 px-3 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveRibbonTab('home')}
            className={`px-3 py-1.5 border-b-2 transition ${
              activeRibbonTab === 'home'
                ? 'border-blue-700 text-blue-700 font-bold bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setActiveRibbonTab('insert')}
            className={`px-3 py-1.5 border-b-2 transition ${
              activeRibbonTab === 'insert'
                ? 'border-blue-700 text-blue-700 font-bold bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Insert
          </button>
          <button
            type="button"
            onClick={() => setActiveRibbonTab('layout')}
            className={`px-3 py-1.5 border-b-2 transition ${
              activeRibbonTab === 'layout'
                ? 'border-blue-700 text-blue-700 font-bold bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Page Layout
          </button>
        </div>

        {/* Ribbon Toolbar Content */}
        <div className="p-2 flex items-center justify-between gap-4 overflow-x-auto bg-stone-50">
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeRibbonTab === 'home' && (
              <>
                {/* Font Family */}
                <select
                  onChange={(e) => applyFormat('fontName', e.target.value)}
                  className="text-xs p-1 rounded border border-stone-300 bg-white"
                >
                  <option value="Calibri">Calibri</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                </select>

                {/* Font Size */}
                <select
                  onChange={(e) => applyFormat('fontSize', e.target.value)}
                  className="text-xs p-1 rounded border border-stone-300 bg-white"
                >
                  <option value="3">12 pt</option>
                  <option value="1">8 pt</option>
                  <option value="2">10 pt</option>
                  <option value="4">14 pt</option>
                  <option value="5">18 pt</option>
                  <option value="6">24 pt</option>
                  <option value="7">36 pt</option>
                </select>

                <div className="h-5 w-[1px] bg-stone-300 mx-1" />

                {/* Bold, Italic, Underline */}
                <button
                  type="button"
                  onClick={() => applyFormat('bold')}
                  className="p-1.5 hover:bg-stone-200 rounded text-stone-800"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('italic')}
                  className="p-1.5 hover:bg-stone-200 rounded text-stone-800"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('underline')}
                  className="p-1.5 hover:bg-stone-200 rounded text-stone-800"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('strikeThrough')}
                  className="p-1.5 hover:bg-stone-200 rounded text-stone-800"
                  title="Strikethrough"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <div className="h-5 w-[1px] bg-stone-300 mx-1" />

                {/* Alignments */}
                <button
                  type="button"
                  onClick={() => applyFormat('justifyLeft')}
                  className="p-1.5 hover:bg-stone-200 rounded text-stone-800"
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('justifyCenter')}
                  className="p-1.5 hover:bg-stone-200 rounded text-stone-800"
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('justifyRight')}
                  className="p-1.5 hover:bg-stone-200 rounded text-stone-800"
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('justifyFull')}
                  className="p-1.5 hover:bg-stone-200 rounded text-stone-800"
                  title="Justify"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>

                <div className="h-5 w-[1px] bg-stone-300 mx-1" />

                {/* Lists */}
                <button
                  type="button"
                  onClick={() => applyFormat('insertUnorderedList')}
                  className="p-1.5 hover:bg-stone-200 rounded text-stone-800"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('insertOrderedList')}
                  className="p-1.5 hover:bg-stone-200 rounded text-stone-800"
                  title="Numbered List"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {activeRibbonTab === 'insert' && (
              <>
                <button
                  type="button"
                  onClick={handleInsertTable}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-stone-200 border border-stone-300 rounded text-xs text-stone-800 font-medium"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Insert Table
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyFormat(
                      'insertHTML',
                      `<p style="border-top: 1px dashed #aaa; margin: 24px 0; text-align: center; color: #888; font-size: 10px;">Page Break</p>`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-stone-200 border border-stone-300 rounded text-xs text-stone-800 font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Page Break
                </button>
              </>
            )}

            {activeRibbonTab === 'layout' && (
              <div className="flex items-center gap-3 text-xs text-stone-700">
                <span>Page Size: <strong>A4 (210 x 297 mm)</strong></span>
                <span>Orientation: <strong>Portrait</strong></span>
                <span>Margins: <strong>Normal (1 inch)</strong></span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-bold transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Directly
            </button>
            <button
              type="button"
              onClick={() => {
                if (onSave && editorRef.current) {
                  onSave(editorRef.current.innerHTML);
                }
                alert('Document changes saved for this order!');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded text-xs font-semibold transition"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body / Realistic A4 Sheet Canvas */}
      <div className="flex-1 overflow-y-auto bg-stone-300 p-8 flex justify-center">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="w-[210mm] min-h-[297mm] bg-white text-stone-900 p-16 shadow-2xl rounded-xs outline-none focus:ring-2 focus:ring-blue-500 font-sans"
          style={{
            lineHeight: 1.6,
            fontSize: '12pt',
            fontFamily: 'Calibri, sans-serif',
          }}
          dangerouslySetInnerHTML={{
            __html:
              initialContent ||
              `
              <h1 style="font-size: 20pt; font-weight: bold; margin-bottom: 12px; color: #1e3a8a;">${documentName}</h1>
              <p style="margin-bottom: 12px;">This document was submitted by the customer for counter printing and modification.</p>
              <p style="margin-bottom: 12px;">You can type directly anywhere on this page, edit existing text, fix grammar, adjust formatting, or insert tables before printing.</p>
              ${customerNote ? `<div style="padding: 10px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; margin-bottom: 16px;"><strong>Customer Instruction:</strong> ${customerNote}</div>` : ''}
              <p>Type your edits below...</p>
            `,
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-stone-200 border-t border-stone-300 px-4 flex items-center justify-between text-[11px] text-stone-600 select-none shrink-0">
        <div>
          <span>Page 1 of 1</span> • <span>English</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Zoom: {zoom}%</span>
        </div>
      </div>
    </div>
  );
}
