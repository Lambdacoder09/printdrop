/**
 * Page range parsing and validation utilities for PrintDrop
 * Handles user ranges like "1-5, 8, 11-14"
 */

export interface PageRangeValidationResult {
  isValid: boolean;
  error?: string;
  pages: number[];
  count: number;
}

/**
 * Parses a page range string (e.g. "1-3, 5, 8-10") into a sorted, unique array of 1-based page numbers.
 */
export function parsePageRange(rangeStr: string, maxPages?: number): number[] {
  if (!rangeStr || typeof rangeStr !== 'string' || !rangeStr.trim()) {
    if (maxPages && maxPages > 0) {
      return Array.from({ length: maxPages }, (_, i) => i + 1);
    }
    return [];
  }

  const clean = rangeStr.trim();
  // Check for "all" keyword
  if (clean.toLowerCase() === 'all') {
    if (maxPages && maxPages > 0) {
      return Array.from({ length: maxPages }, (_, i) => i + 1);
    }
    return [];
  }

  const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);
  const pageSet = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < 1) {
        continue;
      }

      const min = Math.min(start, end);
      const max = Math.max(start, end);

      for (let p = min; p <= max; p++) {
        if (!maxPages || p <= maxPages) {
          pageSet.add(p);
        }
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1) {
        if (!maxPages || page <= maxPages) {
          pageSet.add(page);
        }
      }
    }
  }

  return Array.from(pageSet).sort((a, b) => a - b);
}

/**
 * Validates a user-entered page range string against a document's total page count.
 */
export function validatePageRange(rangeStr: string, maxPages?: number): PageRangeValidationResult {
  if (!rangeStr || !rangeStr.trim()) {
    const defaultCount = maxPages || 1;
    return {
      isValid: true,
      pages: maxPages ? Array.from({ length: maxPages }, (_, i) => i + 1) : [1],
      count: defaultCount,
    };
  }

  const pattern = /^\s*(\d+|\d+\s*-\s*\d+)(\s*,\s*(\d+|\d+\s*-\s*\d+))*\s*$/i;
  if (!pattern.test(rangeStr) && rangeStr.trim().toLowerCase() !== 'all') {
    return {
      isValid: false,
      error: 'Invalid format. Use format like "1-5, 8, 12-14" or "all".',
      pages: [],
      count: 0,
    };
  }

  const pages = parsePageRange(rangeStr, maxPages);
  if (pages.length === 0) {
    return {
      isValid: false,
      error: 'No valid pages parsed from range.',
      pages: [],
      count: 0,
    };
  }

  if (maxPages) {
    // Check if any numbers specified in the range exceeded maxPages
    const rawParts = rangeStr.split(',').map((p) => p.trim());
    for (const part of rawParts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (start > maxPages || end > maxPages) {
          return {
            isValid: false,
            error: `Page range exceeds total document pages (${maxPages}).`,
            pages,
            count: pages.length,
          };
        }
      } else {
        const p = parseInt(part, 10);
        if (p > maxPages) {
          return {
            isValid: false,
            error: `Page ${p} exceeds total document pages (${maxPages}).`,
            pages,
            count: pages.length,
          };
        }
      }
    }
  }

  return {
    isValid: true,
    pages,
    count: pages.length,
  };
}

/**
 * Returns total billable page count factoring in custom range and copies.
 */
export function calculateBillablePages(
  pageRange?: string,
  totalDocPages?: number,
  copies: number = 1
): number {
  const safeCopies = Math.max(1, copies || 1);
  if (!pageRange || !pageRange.trim() || pageRange.trim().toLowerCase() === 'all') {
    return (totalDocPages || 1) * safeCopies;
  }
  const pages = parsePageRange(pageRange, totalDocPages);
  const count = pages.length > 0 ? pages.length : (totalDocPages || 1);
  return count * safeCopies;
}
