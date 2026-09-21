import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FileItem } from '@/types/file-system';
import { Download, ExternalLink, Loader2 } from 'lucide-react';

const WORKER_URL = 'https://icse-file-proxy1.bybro.workers.dev';

interface ViewerModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const ViewerModal: React.FC<ViewerModalProps> = ({ file, onClose }) => {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!file) return;
    setEmbedUrl(null);
    setError(false);
    setLoading(true);
    fetch(`${WORKER_URL}/file?id=${file.fileId}`)
      .then(res => res.json())
      .then(data => { setEmbedUrl(data.url); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [file]);

  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="!max-w-[calc(100vw-16px)] w-[calc(100vw-16px)] h-[calc(100vh-16px)] flex flex-col p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl gap-2">
        {/* Compact Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 pt-0.5 px-1 space-y-0 shrink-0">
          <DialogTitle className="text-sm sm:text-base font-semibold truncate max-w-[65%] sm:max-w-[80%] text-slate-800 dark:text-slate-100">
            {file.name ?? 'Untitled File'}
          </DialogTitle>
          <div className="flex items-center gap-2 pr-8">
            {embedUrl && (
              <>
                <a
                  href={`https://drive.google.com/file/d/${file.fileId}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open in Drive</span>
                </a>
                
                <a
                  href={`https://drive.google.com/uc?export=download&id=${file.fileId}`}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Maximized Main Content Area */}
        <div className="flex-1 w-full h-full min-h-0 pt-0">
          {loading && (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="text-sm">Loading document...</span>
            </div>
          )}
          {error && (
            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              Could not load file. Try opening in Drive directly.
            </div>
          )}
          {embedUrl && file.type === 'image' ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/5 dark:bg-slate-950/40 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 p-2">
              <img src={embedUrl} alt={file.name ?? 'Image'} className="max-h-full max-w-full object-contain rounded-md shadow-sm" />
            </div>
          ) : embedUrl ? (
            <iframe
              src={`https://drive.google.com/file/d/${file.fileId}/preview`}
              className="w-full h-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-inner"
              title={file.name ?? 'Document'}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};