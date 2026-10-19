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
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileName = file?.name?.toLowerCase() || '';
  const isPdf = fileName.endsWith('.pdf');
  const isImage = file?.type === 'image' || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp');
  const isHtml = fileName.endsWith('.html');

  useEffect(() => {
    if (!file) return;
    setContentUrl(null);
    setHtmlContent(null);
    setError(null);
    setLoading(true);

    if (isPdf || isImage) {
      // Use Worker 1 for PDFs and Images (returns JSON preview URL)
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
      // Use Worker 2 for Raw HTML files (returns raw text content)
      fetch(`${WORKER_RAW_URL}/file?id=${file.fileId}`)
        .then(res => res.text())
        .then(text => {
          setHtmlContent(text);
          setLoading(false);
        })
        .catch(() => {
          setError('Could not load raw HTML file.');
          setLoading(false);
        });
    } else {
      // Unsupported format error
      setError('Unsupported file format.');
      setLoading(false);
    }
  }, [file, isPdf, isImage, isHtml]);

  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="!max-w-[92vw] w-[92vw] h-[90vh] flex flex-col p-4 bg-white dark:bg-slate-900 border-none shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 space-y-0">
          <DialogTitle className="text-lg font-semibold truncate max-w-[80%] text-slate-800 dark:text-slate-100">
            {file.name ?? 'Untitled File'}
          </DialogTitle>
          <div className="flex items-center gap-3 pr-8">
            <a
              href={`https://drive.google.com/file/d/${file.fileId}/view`}
              target="_blank"
              rel="noreferrer"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in Drive</span>
            </a>
            
            <a
              href={`https://drive.google.com/uc?export=download&id=${file.fileId}`}
              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
          </div>
        </DialogHeader>

        <div className="flex-1 w-full h-full min-h-0 pt-3">
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
            isHtml ? (
              <iframe
                srcDoc={htmlContent || ''}
                className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white shadow-inner"
                title={file.name ?? 'HTML Preview'}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : isImage && contentUrl ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-900/5 dark:bg-slate-950/40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 p-4">
                <img src={contentUrl} alt={file.name ?? 'Image'} className="max-h-full max-w-full object-contain rounded-md shadow-sm" />
              </div>
            ) : isPdf && contentUrl ? (
              <iframe
                src={contentUrl}
                className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-inner"
                title={file.name ?? 'Document'}
              />
            ) : null
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
