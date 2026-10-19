import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FileItem } from '@/types/file-system';
import { Download, ExternalLink, Loader2 } from 'lucide-react';

const WORKER_PREVIEW_URL = 'https://icse-file-proxy1.bybro.workers.dev';
const WORKER_RAW_URL = 'https://icse-file-proxy2.bybro.workers.dev';

interface ViewerModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const ViewerModal: React.FC<ViewerModalProps> = ({ file, onClose }) => {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [htmlObjectUrl, setHtmlObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileName = file?.name?.toLowerCase() || '';
  const isPdf = fileName.endsWith('.pdf');
  const isImage = file?.type === 'image' || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp');
  const isHtml = fileName.endsWith('.html');

  useEffect(() => {
    if (!file) return;
    setContentUrl(null);
    setHtmlObjectUrl(null);
    setError(null);
    setLoading(true);

    if (isPdf || isImage) {
      // Use Worker 1 for PDFs and Images (expects JSON preview URL)
      fetch(`${WORKER_PREVIEW_URL}/file?id=${file.fileId}`)
        .then(res => res.json())
        .then(data => {
          setContentUrl(data.url);
          setLoading(false);
        })
        .catch(() => {
          setError('Could not load file preview.');
          setLoading(false);
        });
    } else if (isHtml) {
      // Use Worker 2 for HTML files (handles both JSON wrappers and raw text safely)
      fetch(`${WORKER_RAW_URL}/file?id=${file.fileId}`)
        .then(async res => {
          const contentType = res.headers.get('content-type') || '';
          let htmlText = '';

          if (contentType.includes('application/json')) {
            const data = await res.json();
            // Extract HTML from common JSON response keys, or fallback to stringified JSON
            htmlText = data.html || data.content || data.text || data.rawText || JSON.stringify(data);
          } else {
            htmlText = await res.text();
          }

          const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8' });
          const blobUrl = URL.createObjectURL(blob);
          setHtmlObjectUrl(blobUrl);
          setLoading(false);
        })
        .catch(() => {
          setError('Could not load raw HTML file.');
          setLoading(false);
        });
    } else {
      setError('Unsupported file format.');
      setLoading(false);
    }

    // Cleanup object URL on unmount or file change
    return () => {
      if (htmlObjectUrl) {
        URL.revokeObjectURL(htmlObjectUrl);
      }
    };
  }, [file, isPdf, isImage, isHtml]);

  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl w-[90vw] h-[88vh] flex flex-col p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl gap-2">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 pt-0 px-1 space-y-0 shrink-0">
          <DialogTitle className="text-base font-semibold truncate max-w-[65%] text-slate-800 dark:text-slate-100">
            {file.name ?? 'Untitled File'}
          </DialogTitle>
          <div className="flex items-center gap-2 pr-8">
            <a
              href={`https://drive.google.com/file/d/${file.fileId}/view`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Drive</span>
            </a>
            
            <a
              href={`https://drive.google.com/uc?export=download&id=${file.fileId}`}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        </DialogHeader>

        <div className="flex-1 w-full h-full min-h-0 pt-1">
          {loading && (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="text-sm">Loading document...</span>
            </div>
          )}

          {error && (
            <div className="w-full h-full flex items-center justify-center text-red-500 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          {!loading && !error && (
            isHtml && htmlObjectUrl ? (
              <iframe
                src={htmlObjectUrl}
                className="w-full h-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white shadow-inner"
                title={file.name ?? 'HTML Preview'}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : isImage && contentUrl ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-900/5 dark:bg-slate-950/40 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 p-2">
                <img src={contentUrl} alt={file.name ?? 'Image'} className="max-h-full max-w-full object-contain rounded-md shadow-sm" />
              </div>
            ) : isPdf && contentUrl ? (
              <iframe
                src={contentUrl}
                className="w-full h-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-inner"
                title={file.name ?? 'Document'}
              />
            ) : null
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
