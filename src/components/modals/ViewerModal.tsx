import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { fetchFileEmbed } from "../../lib/api";
import { isImageFile } from "../../lib/fileTree";
import { useUI } from "../../context/UIContext";
import ModalShell from "./ModalShell";

const VIEWER_VERSION = "2026.10.20-04";

type Status = "loading" | "ready" | "error";

export default function ViewerModal() {
  const { viewerFile, closeModal } = useUI();

  const [status, setStatus] = useState<Status>("loading");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!viewerFile) return;

    let cancelled = false;
    const controller = new AbortController();

    const fileName = viewerFile.name.toLowerCase();
    const isHtml =
      fileName.endsWith(".html") || fileName.endsWith(".htm");

    setStatus("loading");
    setImageUrl(null);
    setHtmlContent(null);
    setErrorMessage("");

    if (!viewerFile.driveId) {
      setErrorMessage("This file has no linked Drive document yet.");
      setStatus("error");

      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    if (isHtml) {
      fetch(
        `https://icse-file-proxy2.bybro.workers.dev/file?id=${encodeURIComponent(
          viewerFile.driveId
        )}`,
        { signal: controller.signal }
      )
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(
              `Failed to load HTML (${response.status}).`
            );
          }

          return response.text();
        })
        .then((html) => {
          if (cancelled) return;

          setHtmlContent(html);
          setStatus("ready");
        })
        .catch((error: Error) => {
          if (cancelled || error.name === "AbortError") return;

          setErrorMessage(
            error.message || "Could not load HTML study material."
          );
          setStatus("error");
        });

      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    fetchFileEmbed(viewerFile.driveId)
      .then((result) => {
        if (cancelled) return;

        setImageUrl(result.url);
        setStatus("ready");
      })
      .catch((error: Error) => {
        if (cancelled) return;

        setErrorMessage(
          error.message || "Failed to load this file."
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [viewerFile]);

  if (!viewerFile) return null;

  const driveId = viewerFile.driveId;
  const fileName = viewerFile.name.toLowerCase();

  const isHtml =
    fileName.endsWith(".html") || fileName.endsWith(".htm");
  const isImage = isImageFile(viewerFile.name);

  const driveViewUrl = driveId
    ? `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/view`
    : "#";

  const driveDownloadUrl = driveId
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`
    : "#";

  const downloadHref =
    isHtml && driveId
      ? `https://icse-file-proxy2.bybro.workers.dev/file?id=${encodeURIComponent(driveId)}&download=true`
      : driveDownloadUrl;

  const htmlSrcDoc = htmlContent
    ? `<!DOCTYPE html>
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
  <main class="markdown-body">${htmlContent}</main>

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
</html>`
    : undefined;

  return (
    <ModalShell
      title={`${viewerFile.name} · V${VIEWER_VERSION}`}
      onClose={closeModal}
      widthClassName="w-full"
      heightClassName="h-full"
      paddingClassName="p-2"
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Preview area */}
        <div className="min-h-0 flex-1 overflow-hidden bg-midnight">
          {status === "loading" && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-accent-indigo-soft" />
              <p className="text-sm">Loading preview…</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-slate-500">
              <AlertTriangle className="h-6 w-6 text-danger" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          {status === "ready" && (
            <>
              {isHtml && htmlSrcDoc ? (
                <iframe
                  srcDoc={htmlSrcDoc}
                  title={viewerFile.name}
                  className="h-full w-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : isImage && imageUrl ? (
                <div className="flex h-full items-center justify-center overflow-auto p-4">
                  <img
                    src={imageUrl}
                    alt={viewerFile.name}
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={`https://drive.google.com/file/d/${encodeURIComponent(driveId!)}/preview`}
                  title={viewerFile.name}
                  className="h-full w-full border-0"
                />
              )}
            </>
          )}
        </div>

        {/* Slim footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-1.5">
          <span
            title="Viewer code version"
            className="inline-flex items-center rounded border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold leading-none tracking-wide text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300"
          >
            V{VIEWER_VERSION}
          </span>

          <div className="ml-auto flex items-center justify-end gap-2">
            <a
              href={driveViewUrl}
              target="_blank"
              rel="noreferrer noopener"
              aria-disabled={status !== "ready" || !driveId}
              onClick={(event) => {
                if (status !== "ready" || !driveId) {
                  event.preventDefault();
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-hover ${
                status === "ready" && driveId
                  ? ""
                  : "pointer-events-none opacity-40"
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open in Drive</span>
            </a>

            <a
              href={downloadHref}
              target="_blank"
              rel="noreferrer noopener"
              aria-disabled={status !== "ready" || !driveId}
              onClick={(event) => {
                if (status !== "ready" || !driveId) {
                  event.preventDefault();
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-indigo to-accent-violet px-3 py-1.5 text-xs font-medium text-white transition-transform hover:scale-[1.02] ${
                status === "ready" && driveId
                  ? ""
                  : "pointer-events-none opacity-40"
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
