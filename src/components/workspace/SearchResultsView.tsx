import { FileText, Folder, Image as ImageIcon } from "lucide-react";
import { isImageFile } from "../../lib/fileTree";
import type { SearchEntry } from "../../lib/search";

interface SearchResultsViewProps {
  query: string;
  results: SearchEntry[];
  onSelect: (entry: SearchEntry) => void;
}

export default function SearchResultsView({ query, results, onSelect }: SearchResultsViewProps) {
  return (
    <section className="mt-8">
      <p className="text-sm text-slate-500">
        Search results for <span className="text-slate-300">"{query}"</span>
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
        {results.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No files or folders match this search.</p>
        ) : (
          results.map((entry, index) => {
            const isFolder = entry.item.type === "folder";
            const Icon = isFolder ? Folder : isImageFile(entry.item.name) ? ImageIcon : FileText;
            return (
              <button
                key={`${entry.tabId}-${entry.item.id}`}
                type="button"
                onClick={() => onSelect(entry)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover ${
                  index === results.length - 1 ? "" : "border-b border-border"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isFolder ? "bg-accent-indigo/10 text-accent-indigo-soft" : "bg-white/5 text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-200">{entry.item.name}</span>
                  <span className="block truncate text-xs text-slate-500">{entry.breadcrumb.join(" · ")}</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
