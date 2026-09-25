import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
  heightClassName?: string;
  /** Gap between the modal and the viewport edge on every side. Defaults to 16px; the viewer uses a tighter 12px for a near-fullscreen feel. */
  paddingClassName?: string;
}

export default function ModalShell({
  title,
  onClose,
  children,
  widthClassName = "w-[95vw] max-w-2xl",
  heightClassName = "max-h-[85vh]",
  paddingClassName = "p-4",
}: ModalShellProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return createPortal(
    <div className={`fixed inset-0 z-[60] flex items-center justify-center ${paddingClassName}`}>
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className={`relative flex ${heightClassName} ${widthClassName} animate-scale-in flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-panel`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-surface-hover hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}
