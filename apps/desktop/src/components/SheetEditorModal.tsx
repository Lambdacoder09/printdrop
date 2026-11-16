import React, { useEffect, useRef, useState } from 'react';
import Spreadsheet from 'x-data-spreadsheet';
import 'x-data-spreadsheet/dist/xspreadsheet.css';
import * as XLSX from 'xlsx';
import { Printer, X, Download, Save, Check } from 'lucide-react';

interface SheetEditorModalProps {
  documentName: string;
  customerNote?: string;
  onClose: () => void;
  onSave?: (data: any) => void;
}

export default function SheetEditorModal({
  documentName,
  customerNote,
  onClose,
  onSave,
}: SheetEditorModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spreadsheetInstance = useRef<any>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize x-data-spreadsheet
    const xs = new Spreadsheet(containerRef.current, {
      showToolbar: true,
      showGrid: true,
      showContextmenu: true,
      view: {
        height: () => (containerRef.current ? containerRef.current.clientHeight : 600),
        width: () => (containerRef.current ? containerRef.current.clientWidth : 1000),
      },
      row: {
        len: 100,
        height: 25,
      },
      col: {
        len: 26,
        width: 100,
        indexWidth: 60,
        minWidth: 60,
      },
    });

    // Seed default sample table if blank
    xs.loadData([
      {
        name: 'Sheet1',
        rows: {
          0: {
            cells: {
              0: { text: 'S.No', style: 0 },
              1: { text: 'Particulars', style: 0 },
              2: { text: 'Quantity', style: 0 },
              3: { text: 'Rate (₹)', style: 0 },
              4: { text: 'Amount (₹)', style: 0 },
            },
          },
          1: {
            cells: {
              0: { text: '1' },
              1: { text: 'B&W Photocopy' },
              2: { text: '10' },
              3: { text: '2.00' },
              4: { text: '=C2*D2' },
            },
          },
          2: {
            cells: {
              0: { text: '2' },
              1: { text: 'Color Certificates' },
              2: { text: '4' },
              3: { text: '10.00' },
              4: { text: '=C3*D3' },
            },
          },
          3: {
            cells: {
              0: { text: '3' },
              1: { text: 'Lamination' },
              2: { text: '2' },
              3: { text: '20.00' },
              4: { text: '=C4*D4' },
            },
          },
          4: {
            cells: {
              1: { text: 'TOTAL' },
              4: { text: '=SUM(E2:E4)' },
            },
          },
        },
      },
    ]);

    spreadsheetInstance.current = xs;

    return () => {
      // Cleanup if needed
    };
  }, []);

  const handlePrint = () => {
    try {
      const data = spreadsheetInstance.current?.getData();
      if (!data || data.length === 0) {
        window.print();
        return;
      }
      const sheet = data[0];
      const rows = sheet.rows || {};

      let tableHtml = '';
      const rowKeys = Object.keys(rows)
        .map(Number)
        .filter((k) => !isNaN(k))
        .sort((a, b) => a - b);

      const maxCol = 8;
      for (const r of rowKeys) {
        const cells = rows[r]?.cells || {};
        let cellsHtml = '';
        for (let c = 0; c < maxCol; c++) {
          const cellVal = cells[c]?.text || '';
          const isHeader = r === 0;
          if (isHeader) {
            cellsHtml += `<th style="border: 1px solid #444; padding: 6px 10px; background: #e5e7eb; font-weight: bold; text-align: left;">${cellVal}</th>`;
          } else {
            cellsHtml += `<td style="border: 1px solid #999; padding: 6px 10px; text-align: left;">${cellVal}</td>`;
          }
        }
        tableHtml += `<tr>${cellsHtml}</tr>`;
      }

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${documentName}</title>
            <style>
              @page { size: A4 landscape; margin: 15mm; }
              body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; margin: 0; padding: 0; }
              h2 { font-size: 15pt; margin-bottom: 14px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            </style>
          </head>
          <body>
            <h2>${documentName}</h2>
            <table>${tableHtml}</table>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 1500);
      }, 200);
    } catch {
      window.print();
    }
  };

  const handleExportXLSX = () => {
    try {
      const ws = XLSX.utils.aoa_to_sheet([
        ['S.No', 'Particulars', 'Quantity', 'Rate (₹)', 'Amount (₹)'],
        [1, 'B&W Photocopy', 10, 2, 20],
        [2, 'Color Certificates', 4, 10, 40],
        [3, 'Lamination', 2, 20, 40],
        ['', 'TOTAL', '', '', 100],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, `${documentName.replace(/\.[^/.]+$/, '')}_edited.xlsx`);
    } catch (err) {
      alert('Could not export spreadsheet');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex flex-col sheet-editor-modal">
      {/* Excel Title Bar - strictly hidden in print */}
      <div className="no-print print:hidden editor-chrome editor-header h-11 bg-white text-stone-900 flex items-center justify-between px-4 select-none shrink-0 border-b border-stone-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            X
          </div>
          <span className="text-xs font-bold text-stone-900">{documentName}</span>
          <span className="text-[11px] text-stone-500">- Excel Spreadsheet Editor (Shop Workstation)</span>
        </div>

        <div className="flex items-center gap-2">
          {customerNote && (
            <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">
              Customer Note: {customerNote}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition cursor-pointer"
            title="Close editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Action Bar - strictly hidden in print */}
      <div className="no-print print:hidden editor-chrome editor-toolbar h-11 bg-stone-50 border-b border-stone-200 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 text-xs font-medium text-stone-700">
          <span className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded font-bold text-xs">
            Ready to Edit
          </span>
          <span className="text-[11px] text-stone-500">
            Full cell editing, math formulas (=SUM, =A1*B1), row/col adjustments supported.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportXLSX}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-stone-200 text-stone-800 border border-stone-300 rounded text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export .xlsx
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Grid
          </button>
          <button
            type="button"
            onClick={() => {
              if (onSave && spreadsheetInstance.current) {
                onSave(spreadsheetInstance.current.getData());
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 2500);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-900 hover:bg-stone-800 text-white'
            }`}
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {savedSuccess ? 'Changes Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Spreadsheet Container */}
      <div className="flex-1 overflow-hidden bg-white p-1" ref={containerRef} />
    </div>
  );
}
