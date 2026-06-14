/**
 * Client-side export utilities for CSV and JSON file generation.
 */

/**
 * Escape a value for CSV output.
 * Handles commas, double-quotes, newlines, and null/undefined.
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Get column names from fields metadata or row object keys.
 */
function getColumnNames(rows, fields) {
  if (fields?.length > 0) {
    return fields.map(f => f.name);
  }
  if (rows?.length > 0) {
    return Object.keys(rows[0]);
  }
  return [];
}

/**
 * Generate a Blob containing CSV data with BOM for Excel compatibility.
 * @param {Array<Object>} rows - Array of row objects
 * @param {Array<{name: string}>} fields - Array of field metadata objects
 * @returns {Blob|null} CSV blob or null if no data
 */
export function generateCSV(rows, fields) {
  if (!rows || rows.length === 0) return null;

  const headers = getColumnNames(rows, fields);
  if (headers.length === 0) return null;

  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => escapeCSV(row[h])).join(','),
    ),
  ];

  // BOM ensures Excel opens UTF-8 CSV correctly
  const BOM = '\uFEFF';
  const csvContent = BOM + csvRows.join('\r\n');

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Generate a Blob containing pretty-printed JSON data.
 * Preserves the original array-of-objects structure.
 * @param {Array<Object>} rows - Array of row objects
 * @returns {Blob|null} JSON blob or null if no data
 */
export function generateJSON(rows) {
  if (!rows || rows.length === 0) return null;

  const jsonContent = JSON.stringify(rows, null, 2);
  return new Blob([jsonContent], { type: 'application/json' });
}

/**
 * Generate a meaningful filename with the current date.
 * @param {'csv'|'json'} format - File extension
 * @returns {string} e.g. query-results-2026-06-14.csv
 */
export function getExportFilename(format) {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `query-results-${date}.${format}`;
}

/**
 * Trigger a browser file download from a Blob.
 * @param {Blob} blob - The file data
 * @param {string} filename - The download filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}