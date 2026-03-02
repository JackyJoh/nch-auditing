import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { parseSpreadsheetPreview, getSpreadsheetRowCount, SpreadsheetPreviewData } from '../utils/parseSpreadsheet';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileInfoBadgeProps {
  file: File;
}

export const FileInfoBadge: React.FC<FileInfoBadgeProps> = ({ file }) => {
  const [rowCount, setRowCount] = useState<number | null>(null);
  const isSpreadsheet = /\.(xlsx|xls|csv)$/i.test(file.name);

  useEffect(() => {
    if (!isSpreadsheet) return;
    setRowCount(null);
    getSpreadsheetRowCount(file).then(setRowCount).catch(() => setRowCount(null));
  }, [file, isSpreadsheet]);

  return (
    <p className="text-white/50 text-xs mt-1">
      {formatFileSize(file.size)}{rowCount !== null ? ` · ${rowCount.toLocaleString()} rows` : ''}
    </p>
  );
};

interface FilePreviewModalProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
}

interface FilePreviewButtonProps {
  file: File | null;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  const [data, setData] = useState<SpreadsheetPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !file) return;
    setLoading(true);
    setError(null);
    parseSpreadsheetPreview(file, 10)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to parse file'))
      .finally(() => setLoading(false));
  }, [file, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-slate-800 border border-slate-600/50 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-600/50 bg-slate-700/60 rounded-t-xl">
          <div className="min-w-0">
            <h3 className="text-white font-bold text-lg truncate">{file.name}</h3>
            {data?.sheetName && (
              <p className="text-white/50 text-xs mt-0.5">Sheet: {data.sheetName}</p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="text-white/60 hover:text-white hover:bg-slate-600/60 rounded-lg p-1.5 transition-all duration-200 ml-4 flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
              <span className="text-white/60 ml-3 text-sm">Loading preview...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {data && !loading && !error && (
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0">
                <tr>
                  {data.headers.map((h, i) => (
                    <th
                      key={i}
                      className="bg-slate-700/80 text-indigo-300 font-semibold text-xs uppercase tracking-wider px-4 py-2.5 border-b border-slate-600/50 whitespace-nowrap"
                    >
                      {h || `Column ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={data.headers.length}
                      className="text-white/50 text-sm px-4 py-8 text-center"
                    >
                      No data rows found
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/40'}>
                      {data.headers.map((_, ci) => (
                        <td
                          key={ci}
                          className="text-white/80 text-sm px-4 py-2 border-b border-slate-700/30 whitespace-nowrap"
                        >
                          {row[ci] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {data && !loading && (
          <div className="px-5 py-2.5 border-t border-slate-600/50 bg-slate-700/40 rounded-b-xl">
            <p className="text-white/50 text-xs">
              Showing first {data.rows.length} row{data.rows.length !== 1 ? 's' : ''} &middot; {data.headers.length} column{data.headers.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export const FilePreviewButton: React.FC<FilePreviewButtonProps> = ({ file }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!file) return null;

  const name = file.name.toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
    return null;
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="mt-2 px-3 py-1 text-xs font-semibold rounded-md bg-indigo-600/60 hover:bg-indigo-500/60 border border-indigo-500/50 text-white/90 hover:text-white transition-all duration-200"
      >
        Preview
      </button>
      {isOpen && (
        <FilePreviewModal
          file={file}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
