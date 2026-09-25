import { Check, ChevronRight, Eye, FileText, Folder, Image as ImageIcon } from "lucide-react";
import type { FileItem } from "../../types";
import { isImageFile } from "../../lib/fileTree";

interface FileRowProps {
  item: FileItem;
  onOpenFolder: (item: FileItem) => void;
  onOpenFile: (item: FileItem) => void;
  isLast?: boolean;
  /** When true, clicking a file toggles selection instead of opening it (used by the Quizzes tab). */
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (item: FileItem) => void;
}

export default function FileRow({
  item,
  onOpenFolder,
  onOpenFile,
  isLast,
  selectionMode,
  isSelected,
  onToggleSelect,
}: FileRowProps) {
  const isFolder = item.type === "folder";
  const Icon = isFolder ? Folder : isImageFile(item.name) ? ImageIcon : FileText;

  const metaLine = [item.sizeLabel, item.updatedAt].filter(Boolean).join(" · ");

  function handleClick() {
    if (isFolder) {
      onOpenFolder(item);
    } else if (selectionMode) {
      onToggleSelect?.(item);
    } else {
      onOpenFile(item);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover ${
        isLast ? "" : "border-b border-border"
      } ${!isFolder && selectionMode && isSelected ? "bg-accent-indigo/10" : ""}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isFolder ? "bg-accent-indigo/10 text-accent-indigo-soft" : "bg-white/5 text-slate-400"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-slate-200">{item.name}</span>
        {metaLine && <span className="block truncate text-xs text-slate-500">{metaLine}</span>}
      </span>

      {isFolder ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
      ) : selectionMode ? (
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            isSelected ? "border-accent-indigo bg-accent-indigo text-white" : "border-border-strong bg-midnight"
          }`}
        >
          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
        </span>
      ) : (
        <Eye className="h-4 w-4 shrink-0 text-slate-600" />
      )}
    </button>
  );
}
