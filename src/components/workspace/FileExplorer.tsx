import { useMemo } from "react";
import { ChevronRight, Home } from "lucide-react";
import type { FileItem } from "../../types";
import FileRow from "./FileRow";

interface FileExplorerProps {
  rootItems: FileItem[];
  rootLabel: string;
  path: FileItem[];
  onOpenFolder: (item: FileItem) => void;
  onGoToCrumb: (index: number) => void;
  onOpenFile: (item: FileItem) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (item: FileItem) => void;
}

export default function FileExplorer({
  rootItems,
  rootLabel,
  path,
  onOpenFolder,
  onGoToCrumb,
  onOpenFile,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: FileExplorerProps) {
  const currentItems = useMemo<FileItem[]>(() => {
    if (path.length === 0) return rootItems;
    return path[path.length - 1].children ?? [];
  }, [path, rootItems]);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <button
          type="button"
          onClick={() => onGoToCrumb(-1)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-surface-hover hover:text-slate-200"
        >
          <Home className="h-3.5 w-3.5" />
          {rootLabel}
        </button>
        {path.map((crumb, index) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-slate-700" />
            <button
              type="button"
              onClick={() => onGoToCrumb(index)}
              className="rounded px-1.5 py-0.5 transition-colors hover:bg-surface-hover hover:text-slate-200"
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
        {currentItems.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">This folder is empty.</p>
        ) : (
          currentItems.map((item, index) => (
            <FileRow
              key={item.id}
              item={item}
              onOpenFolder={onOpenFolder}
              onOpenFile={onOpenFile}
              isLast={index === currentItems.length - 1}
              selectionMode={selectionMode}
              isSelected={selectedIds?.has(item.id)}
              onToggleSelect={onToggleSelect}
            />
          ))
        )}
      </div>
    </section>
  );
}
