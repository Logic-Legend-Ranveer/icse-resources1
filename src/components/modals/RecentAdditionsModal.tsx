import { FileText, Image as ImageIcon, Inbox } from "lucide-react";
import type { FileItem } from "../../types";
import { isImageFile } from "../../lib/fileTree";
import { useUI } from "../../context/UIContext";
import ModalShell from "./ModalShell";

interface RecentAdditionsModalProps {
  recentFiles: FileItem[];
}

export default function RecentAdditionsModal({ recentFiles }: RecentAdditionsModalProps) {
  const { closeModal, openViewer } = useUI();

  return (
    <ModalShell title="Recent additions" onClose={closeModal} widthClassName="w-[95vw] max-w-lg" heightClassName="max-h-[70vh]">
      <div className="h-full overflow-y-auto p-2">
        {recentFiles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-slate-500">
            <Inbox className="h-6 w-6" />
            <p className="text-sm">Nothing new yet — check back soon.</p>
          </div>
        ) : (
          recentFiles.map((item) => {
            const Icon = isImageFile(item.name) ? ImageIcon : FileText;
            const metaLine = [item.sizeLabel, item.updatedAt].filter(Boolean).join(" · ");
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openViewer(item)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-highlight/10 text-highlight-soft">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-200">{item.name}</span>
                  {metaLine && <span className="block truncate text-xs text-slate-500">{metaLine}</span>}
                </span>
              </button>
            );
          })
        )}
      </div>
    </ModalShell>
  );
}
