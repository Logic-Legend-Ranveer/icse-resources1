import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FileItem } from '@/types/file-system';
import { Download, ExternalLink } from 'lucide-react';

interface ViewerModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const ViewerModal: React.FC<ViewerModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  // Safe check for missing/null URL
  const fileUrl = file.url ?? '';

  // Use Google Docs Viewer fallback for external URLs that block iframe embedding
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
    }
    return url;
  };

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="!max-w-[92vw] w-[92vw] h-[90vh] flex flex-col p-4 bg-white border-none shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0">
          <DialogTitle className="text-lg font-semibold truncate max-w-[80%] text-slate-800">
            {file.name ?? 'Untitled File'}
          </DialogTitle>
          <div className="flex items-center gap-3 pr-8">
            {fileUrl && (
              <>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-medium"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Original</span>
                </a>
                <a
                  href={fileUrl}
                  download
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
              </>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 w-full h-full min-h-0 pt-3">
          {!fileUrl ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              No preview or link available for this item.
            </div>
          ) : file.type === 'image' ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/5 rounded-xl overflow-hidden border border-slate-200 p-4">
              <img src={fileUrl} alt={file.name ?? 'Image'} className="max-h-full max-w-full object-contain rounded-md shadow-sm" />
            </div>
          ) : (
            <iframe
              src={getEmbedUrl(fileUrl)}
              className="w-full h-full rounded-xl border border-slate-200 bg-slate-50 shadow-inner"
              title={file.name ?? 'Document'}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
