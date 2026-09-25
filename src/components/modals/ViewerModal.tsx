import { useEffect, useState } from "react";
import { AlertTriangle, Download, ExternalLink, Loader2 } from "lucide-react";
import { fetchFileEmbed } from "../../lib/api";
import { isImageFile } from "../../lib/fileTree";
import { useUI } from "../../context/UIContext";
import ModalShell from "./ModalShell";

type Status = "loading" | "ready" | "error";

export default function ViewerModal() {
  const { viewerFile, closeModal } = useUI();
  const [status, setStatus] = useState<Status>("loading");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!viewerFile) return;

    if (!viewerFile.driveId) {
      setStatus("error");
      setErrorMessage("This file has no linked Drive document yet.");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setImageUrl(null);

    fetchFileEmbed(viewerFile.driveId)
      .then((result) => {
        if (cancelled) return;
        setImageUrl(result.url);
        setStatus("ready");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMessage(err.message || "Failed to load this file.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [viewerFile]);

  if (!viewerFile) return null;

  const driveId = viewerFile.driveId;
  const isImage = isImageFile(viewerFile.name);
  const driveViewUrl = `https://drive.google.com/file/d/${driveId}/view`;
  const drivePreviewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
  const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;

  return (
    <ModalShell
      title={viewerFile.name}
      onClose={closeModal}
      widthClassName="w-full"
      heightClassName="h-full"
      paddingClassName="p-3"
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 bg-midnight">
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
              {isImage && imageUrl ? (
                <div className="flex h-full items-center justify-center overflow-auto p-4">
                  <img src={imageUrl} alt={viewerFile.name} className="max-h-full max-w-full rounded-lg object-contain" />
                </div>
              ) : (
                <iframe src={drivePreviewUrl} title={viewerFile.name} className="h-full w-full border-0" />
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
          <a
            href={driveViewUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-disabled={status !== "ready"}
            className={`flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-hover ${
              status === "ready" ? "" : "pointer-events-none opacity-40"
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open in Drive</span>
          </a>
          <a
            href={driveDownloadUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-disabled={status !== "ready"}
            className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-indigo to-accent-violet px-3 py-1.5 text-xs font-medium text-white transition-transform hover:scale-[1.02] ${
              status === "ready" ? "" : "pointer-events-none opacity-40"
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </div>
    </ModalShell>
  );
}
