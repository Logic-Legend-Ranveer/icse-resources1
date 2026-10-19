import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FileItem } from '@/types/file-system';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
console.log(
  '%c VIEWER BUILD: 2026.10.20-01 ',
  'background: #047857; color: white; font-size: 16px; padding: 8px;'
);
const VIEWER_VERSION = '2026.10.20-01';
const WORKER_PREVIEW_URL = 'https://icse-file-proxy1.bybro.workers.dev';
const WORKER_RAW_URL = 'https://icse-file-proxy2.bybro.workers.dev';

interface ViewerModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const ViewerModal: React.FC<ViewerModalProps> = ({ file, onClose }) => {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [htmlSrcDoc, setHtmlSrcDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileName = file?.name?.toLowerCase() || '';
  const isPdf = fileName.endsWith('.pdf');
  const isImage = file?.type === 'image' || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp');
  const isHtml = fileName.endsWith('.html') || fileName.endsWith('.htm');

  useEffect(() => {
    if (!file) return;

    // DEBUG LOGS: Check your browser console when you click an HTML file!
    console.log("--- VIEWER MODAL DEBUG ---");
    console.log("File Name:", file.name);
    console.log("File ID:", file.fileId);
    console.log("Is HTML detected?:", isHtml);

    setContentUrl(null);
    setHtmlSrcDoc(null);
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
      const controller = new AbortController();

      fetch(`${WORKER_RAW_URL}/file?id=${encodeURIComponent(file.fileId)}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Fetch failed with status ${res.status}`);
          }

          const rawText = await res.text();
          const cleaned = rawText.trim();

          // Build a full HTML document around the existing HTML fragment.
          const fullHtmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <title>Study Notes</title>

  <link rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown-light.min.css">

  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">

  <style>
    html { background: #fff; }
    body {
      box-sizing: border-box;
      max-width: 980px;
      min-width: 200px;
      margin: 0 auto;
      padding: 24px;
      background: #fff;
      color: #24292f;
      font-family: Arial, sans-serif;
    }
    img { max-width: 100%; height: auto; }
    pre { overflow-x: auto; }
    .katex-display {
      overflow-x: auto;
      overflow-y: hidden;
    }
    @media (max-width: 600px) {
      body { padding: 12px; }
    }
  </style>
</head>
<body>
  <main class="markdown-body">
    ${cleaned}
  </main>

  <script defer
    src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js"></script>

  <script defer
    src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/contrib/auto-render.min.js"
    onload="renderMathInElement(document.querySelector('main'), {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '\\\\[', right: '\\\\]', display: true},
        {left: '\\\\(', right: '\\\\)', display: false}
      ],
      throwOnError: false
    });"></script>
</body>
</html>`;
console.log("Viewer build:", "2026.10.20-01");
console.log("HTML document starts:", fullHtmlDocument.slice(0, 200));
console.log("Contains HTML wrapper:", fullHtmlDocument.includes("<!DOCTYPE html>"));
console.log("Contains article:", fullHtmlDocument.includes("<article"));
          setHtmlSrcDoc(fullHtmlDocument);
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;

          console.error('HTML fetch error:', err);
          setError('Could not load HTML study material.');
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });

      return () => controller.abort();
    }
 else {
      console.warn("Unsupported file format for file:", file.name);
      setError('Unsupported file format.');
      setLoading(false);
    }
  }, [file]);

  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl w-[90vw] h-[88vh] flex flex-col p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl gap-2">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 pt-0 px-1 space-y-0 shrink-0">
        
          <DialogTitle className="text-base font-semibold truncate max-w-[65%] text-slate-800 dark:text-slate-100">
            {file.name ?? 'Untitled File'}
          </DialogTitle>
          <span
  className="shrink-0 rounded-md border border-emerald-200
    bg-emerald-50 px-2 py-1 text-[10px] font-bold
    tracking-wide text-emerald-700
    dark:border-emerald-800 dark:bg-emerald-950
    dark:text-emerald-300"
  title="Viewer code version"
>
  V{VIEWER_VERSION}
</span>
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
            isHtml && htmlSrcDoc ? (
              <iframe
                srcDoc={htmlSrcDoc}
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
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                Preparing preview...
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};