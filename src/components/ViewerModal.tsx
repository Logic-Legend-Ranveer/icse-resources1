import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FileItem } from '@/types/file-system';
import { Download, ExternalLink, Loader2 } from 'lucide-react';

// ← Replace with your actual Cloudflare Worker URL
const WORKER_URL = 'https://icse-file-proxy.YOUR-NAME.workers.dev';

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
      .then(data => {
        setEmbedUrl(data.url);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [file]);

  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="!max-w-[92vw] w-[92vw] h-[90vh] flex flex-col p-4 bg-white border-none shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0">
          <DialogTitle className="text-lg font-semibold truncate max-w-[80%] text-slate-800">
            {file.name ?? 'Untitled File'}
          </DialogTitle>
          <div className="flex items-center gap-3 pr-8">
            {embedUrl && (
              <>
                
                  href={`https://drive.google.com/file/d/${file.fileId}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in Drive</span>
                </a>
                
                  href={`https://drive.google.com/uc?export=download&id=${file.fileId}`}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </>
            )}
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
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              Could not load file. Try opening in Drive directly.
            </div>
          )}
          {embedUrl && file.type === 'image' ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/5 rounded-xl overflow-hidden border border-slate-200 p-4">
              <img src={embedUrl} alt={file.name ?? 'Image'} className="max-h-full max-w-full object-contain rounded-md shadow-sm" />
            </div>
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-xl border border-slate-200 bg-slate-50 shadow-inner"
              title={file.name ?? 'Document'}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
