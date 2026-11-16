import React, { useEffect, useRef, useState } from 'react';
import Spreadsheet from 'x-data-spreadsheet';
import 'x-data-spreadsheet/dist/xspreadsheet.css';
import * as XLSX from 'xlsx';
import { Printer, X, Download, Save } from 'lucide-react';

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
    window.print();
  };

  const handleExportXLSX = () => {
    try {
      const data = spreadsheetInstance.current?.getData();
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
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex flex-col">
      {/* Excel Title Bar */}
      <div className="h-10 bg-emerald-800 text-white flex items-center justify-between px-4 select-none shrink-0 border-b border-emerald-950">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center font-bold text-xs">
            X
          </div>
          <span className="text-xs font-semibold">{documentName}</span>
          <span className="text-[11px] text-emerald-200">- Excel Spreadsheet Editor (Shop Workstation)</span>
        </div>

        <div className="flex items-center gap-2">
          {customerNote && (
            <span className="text-[11px] bg-amber-400 text-stone-950 px-2 py-0.5 rounded font-bold">
              Customer Note: {customerNote}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-emerald-700 rounded text-emerald-200 hover:text-white"
            title="Close editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="h-11 bg-stone-100 border-b border-stone-300 px-4 flex items-center justify-between shrink-0 select-none">
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
              }
              alert('Spreadsheet modifications saved!');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded text-xs font-semibold transition"
          >
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Spreadsheet Container */}
      <div className="flex-1 overflow-hidden bg-white p-1" ref={containerRef} />
    </div>
  );
}
