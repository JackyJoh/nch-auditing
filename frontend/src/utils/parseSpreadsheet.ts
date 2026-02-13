export interface SpreadsheetPreviewData {
  headers: string[];
  rows: string[][];
  sheetName: string;
}

export async function parseSpreadsheetPreview(
  file: File,
  maxRows: number = 10
): Promise<SpreadsheetPreviewData> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', sheetRows: maxRows + 1 });

  if (workbook.SheetNames.length === 0) {
    throw new Error('No sheets found in file');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (raw.length === 0) {
    throw new Error('File is empty');
  }

  const headers = raw[0].map((h) => String(h));
  const rows = raw.slice(1, maxRows + 1).map((row) =>
    row.map((cell) => String(cell))
  );

  return { headers, rows, sheetName };
}
