import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

/**
 * Converts any uploaded document (Image, Word, Excel, Plain Text, or existing PDF)
 * into a standard, printable A4 PDF Blob URL.
 */
export async function convertDocumentToPdfUrl(
  fileBlob: Blob,
  fileName: string,
  customerNote?: string
): Promise<string> {
  const lower = fileName.toLowerCase();

  // 1. If it's already a PDF, return direct Blob URL
  if (lower.endsWith('.pdf') || fileBlob.type === 'application/pdf') {
    return URL.createObjectURL(fileBlob);
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 2. Images (.jpg, .jpeg, .png, etc.)
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || fileBlob.type.startsWith('image/jpeg')) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const image = await pdfDoc.embedJpg(arrayBuffer);
    const dims = image.scaleToFit(width - 80, height - 120);

    // Title header
    page.drawText(fileName, { x: 40, y: height - 40, size: 12, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
    if (customerNote) {
      page.drawText(`Note: ${customerNote}`, { x: 40, y: height - 55, size: 9, font: fontRegular, color: rgb(0.6, 0.4, 0.1) });
    }

    page.drawImage(image, {
      x: (width - dims.width) / 2,
      y: (height - 60 - dims.height) / 2,
      width: dims.width,
      height: dims.height,
    });

    const pdfBytes = await pdfDoc.save();
    return URL.createObjectURL(new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
  }

  if (lower.endsWith('.png') || fileBlob.type.startsWith('image/png')) {
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const image = await pdfDoc.embedPng(arrayBuffer);
    const dims = image.scaleToFit(width - 80, height - 120);

    page.drawText(fileName, { x: 40, y: height - 40, size: 12, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
    if (customerNote) {
      page.drawText(`Note: ${customerNote}`, { x: 40, y: height - 55, size: 9, font: fontRegular, color: rgb(0.6, 0.4, 0.1) });
    }

    page.drawImage(image, {
      x: (width - dims.width) / 2,
      y: (height - 60 - dims.height) / 2,
      width: dims.width,
      height: dims.height,
    });

    const pdfBytes = await pdfDoc.save();
    return URL.createObjectURL(new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
  }

  // 3. Excel Spreadsheets (.xlsx, .xls, .csv)
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')) {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0] || 'Sheet1';
      const sheet = workbook.Sheets[firstSheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const page = pdfDoc.addPage([841.89, 595.28]); // Landscape for spreadsheets
      const { width, height } = page.getSize();

      // Spreadsheet Title Header
      page.drawRectangle({
        x: 30,
        y: height - 60,
        width: width - 60,
        height: 35,
        color: rgb(0.06, 0.45, 0.25), // Excel Green
      });
      page.drawText(`PRINTDROP SPREADSHEET: ${fileName} (${firstSheetName})`, {
        x: 45,
        y: height - 42,
        size: 11,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      let currentY = height - 85;
      const colWidth = Math.min(110, (width - 80) / Math.max(1, (data[0] ? data[0].length : 5)));

      for (let r = 0; r < Math.min(data.length, 25); r++) {
        const row = data[r] || [];
        const isHeader = r === 0;

        if (isHeader) {
          page.drawRectangle({
            x: 40,
            y: currentY - 5,
            width: width - 80,
            height: 20,
            color: rgb(0.9, 0.95, 0.92),
          });
        }

        for (let c = 0; c < Math.min(row.length, 8); c++) {
          const val = row[c] !== undefined && row[c] !== null ? String(row[c]).slice(0, 18) : '';
          page.drawText(val, {
            x: 45 + c * colWidth,
            y: currentY,
            size: 8.5,
            font: isHeader ? fontBold : fontRegular,
            color: isHeader ? rgb(0.05, 0.35, 0.15) : rgb(0.15, 0.15, 0.15),
          });
        }
        currentY -= 18;
      }

      if (customerNote) {
        page.drawText(`Customer Note: ${customerNote}`, {
          x: 40,
          y: 35,
          size: 9,
          font: fontBold,
          color: rgb(0.7, 0.45, 0.05),
        });
      }

      const pdfBytes = await pdfDoc.save();
      return URL.createObjectURL(new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
    } catch (e) {
      console.warn('Excel to PDF conversion fallback:', e);
    }
  }

  // 4. Word Documents (.docx, .doc) or Plain Text (.txt, .rtf, .json, .log)
  let docText = '';
  if (lower.endsWith('.docx')) {
    try {
      const res = await mammoth.extractRawText({ arrayBuffer });
      docText = res.value;
    } catch {
      docText = 'Word Document uploaded for printing.';
    }
  } else {
    try {
      const decoder = new TextDecoder('utf-8');
      docText = decoder.decode(arrayBuffer);
    } catch {
      docText = `Document: ${fileName}`;
    }
  }

  // Render text into styled A4 PDF pages
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Document header banner
  page.drawRectangle({
    x: 40,
    y: height - 65,
    width: width - 80,
    height: 30,
    color: rgb(0.12, 0.23, 0.54), // Navy
  });

  page.drawText(`DOCUMENT: ${fileName}`, {
    x: 50,
    y: height - 50,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  if (customerNote) {
    page.drawRectangle({
      x: 40,
      y: height - 95,
      width: width - 80,
      height: 22,
      color: rgb(0.99, 0.95, 0.8),
    });
    page.drawText(`Special Instruction: ${customerNote}`, {
      x: 50,
      y: height - 85,
      size: 8.5,
      font: fontBold,
      color: rgb(0.65, 0.4, 0.05),
    });
  }

  // Body lines
  const rawLines = docText.split('\n');
  let textY = customerNote ? height - 120 : height - 90;
  for (let i = 0; i < Math.min(rawLines.length, 45); i++) {
    const line = rawLines[i].trim().slice(0, 95);
    if (!line) {
      textY -= 10;
      continue;
    }
    page.drawText(line, {
      x: 50,
      y: textY,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });
    textY -= 15;
    if (textY < 40) break;
  }

  const pdfBytes = await pdfDoc.save();
  return URL.createObjectURL(new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
}

/**
 * Synthesizes a clean, printable placeholder PDF if a document's binary data
 * was not uploaded (e.g. mock/demo order or legacy submission) so that Print & View never fail.
 */
export async function generateFallbackDocumentPdf(
  fileName: string,
  customerNote?: string,
  pageCount: number = 1
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Header banner
  page.drawRectangle({
    x: 40,
    y: height - 70,
    width: width - 80,
    height: 35,
    color: rgb(0.1, 0.15, 0.28),
  });

  page.drawText(`DOCUMENT: ${fileName}`, {
    x: 52,
    y: height - 52,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  if (customerNote) {
    page.drawRectangle({
      x: 40,
      y: height - 105,
      width: width - 80,
      height: 26,
      color: rgb(0.99, 0.95, 0.8),
    });
    page.drawText(`Customer Instruction: ${customerNote}`, {
      x: 52,
      y: height - 93,
      size: 9.5,
      font: fontBold,
      color: rgb(0.65, 0.4, 0.05),
    });
  }

  const startY = customerNote ? height - 140 : height - 100;
  page.drawText(`[Document Content - ${fileName}]`, {
    x: 52,
    y: startY,
    size: 11,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`Estimated Pages: ${pageCount}`, {
    x: 52,
    y: startY - 20,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText('This document is ready for printing directly from the PrintDrop counter workstation.', {
    x: 52,
    y: startY - 45,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawLine({
    start: { x: 50, y: startY - 60 },
    end: { x: width - 50, y: startY - 60 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  const pdfBytes = await pdfDoc.save();
  return URL.createObjectURL(new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
}
