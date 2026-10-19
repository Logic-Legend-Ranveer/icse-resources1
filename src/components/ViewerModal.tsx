import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FileItem } from '@/types/file-system';
import { Download, ExternalLink, Loader2, Globe } from 'lucide-react';

const WORKER_PREVIEW_URL = 'https://icse-file-proxy1.bybro.workers.dev';
const WORKER_RAW_URL = 'https://icse-file-proxy2.bybro.workers.dev';

interface ViewerModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const ViewerModal: React.FC<ViewerModalProps> = ({ file, onClose }) => {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingHtml, setOpeningHtml] = useState(false);

  const fileName = file?.name?.toLowerCase() || '';
  const isPdf = fileName.endsWith('.pdf');
  const isImage = file?.type === 'image' || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp');
  const isHtml = fileName.endsWith('.html') || fileName.endsWith('.htm');

  useEffect(() => {
    if (!file) return;
    setContentUrl(null);
    setError(null);
    setLoading(true);

    if (isPdf || isImage) {
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
      setLoading(false);
    } else {
      setError('Unsupported file format.');
      setLoading(false);
    }
  }, [file, isPdf, isImage, isHtml]);

  // This creates a virtual browser file path (Blob URL) and opens it natively as a webpage
  const handleOpenAsWebpage = async () => {
    if (!file) return;
    setOpeningHtml(true);
    try {
      const res = await fetch(`${WORKER_RAW_URL}/file?id=${file.fileId}`);
      const rawText = await res.text();
      
      let cleaned = rawText.trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        try { cleaned = JSON.parse(cleaned); } catch { cleaned = cleaned.slice(1, -1); }
      }

      const textarea = document.createElement('textarea');
      textarea.innerHTML = cleaned;
      const decodedFragment = textarea.value;

      const fullHtmlDocument = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${file.name ?? 'HTML Preview'}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown-light.min.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
        <style>
          body { 
            box-sizing: border-box; 
            min-width: 200px; 
            max-width: 980px; 
            margin: 0 auto; 
            padding: 45px; 
            background: #ffffff; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          @media (max-width: 767px) { body { padding: 15px; } }
        </style>
      </head>
      <body class="markdown-body">
        ${decodedFragment}
      </body>
      </html>`;

      // Create a virtual local file blob with type text/html
      const blob = new Blob([fullHtmlDocument], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Open the virtual file path in a new tab
      window.open(blobUrl, '_blank');
      onClose();
    } catch {
      setError('Could not load HTML file.');
    } finally {
      setOpeningHtml(false);
    }
  };

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
              <span className="text-sm">Loading preview...</span>
            </div>
          )}

          {error && (
            <div className="w-full h-full flex items-center justify-center text-red-500 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          {!loading && !error && (
            isHtml ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{file.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    Click below to compile and open this study material as a fully styled webpage.
                  </p>
                </div>
                <button
                  onClick={handleOpenAsWebpage}
                  disabled={openingHtml}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {openingHtml ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  <span>{openingHtml ? 'Opening Webpage...' : 'Open Webpage'}</span>
                </button>
              </div>
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
