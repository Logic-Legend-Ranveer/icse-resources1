import { useState } from "react";
import { ChevronRight, FileText, Folder, FolderOpen, Image as ImageIcon } from "lucide-react";
import type { FileItem } from "../../types";
import { useUI } from "../../context/UIContext";

interface SidebarFileTreeProps {
  items: FileItem[];
  depth: number;
}

export default function SidebarFileTree({ items, depth }: SidebarFileTreeProps) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <TreeNode key={item.id} item={item} depth={depth} />
      ))}
    </ul>
  );
}

function TreeNode({ item, depth }: { item: FileItem; depth: number }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const { openViewer } = useUI();

  const isFolder = item.type === "folder";
  const FileIcon = item.mimeType?.startsWith("image/") ? ImageIcon : FileText;

  return (
    <li>
      <button
        type="button"
        onClick={() => (isFolder ? setExpanded((prev) => !prev) : openViewer(item))}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        className="flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm text-slate-400 transition-colors hover:bg-surface-hover hover:text-slate-100"
      >
        {isFolder ? (
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform ${expanded ? "rotate-90" : ""}`} />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {isFolder ? (
          expanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-accent-indigo-soft" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-slate-500" />
          )
        ) : (
          <FileIcon className="h-4 w-4 shrink-0 text-slate-500" />
        )}
        <span className="truncate">{item.name}</span>
      </button>

      {isFolder && expanded && item.children && item.children.length > 0 && (
        <SidebarFileTree items={item.children} depth={depth + 1} />
      )}
    </li>
  );
}
