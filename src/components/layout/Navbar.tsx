import { useEffect, useRef } from "react";
import { Menu, Search, Sparkles } from "lucide-react";
import { useUI } from "../../context/UIContext";
import { TAB_DEFS } from "../../data/tabs";
import type { TabId } from "../../data/tabs";

interface NavbarProps {
  activeTabId: TabId;
  onSelectTab: (tabId: TabId) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

export default function Navbar({ activeTabId, onSelectTab, searchQuery, onSearchQueryChange }: NavbarProps) {
  const { toggleSidebar } = useUI();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-midnight/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-surface-hover hover:text-slate-100 md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-indigo to-accent-violet shadow-glow-indigo">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-slate-100">ICSE Resources</p>
              <p className="hidden text-xs text-slate-500 sm:block">Free study materials, made simple</p>
            </div>
          </div>
        </div>

        {/* Always-visible, focusable quick search — clicking or Ctrl/Cmd+K focuses it directly */}
        <div
          onClick={() => searchInputRef.current?.focus()}
          className="flex w-40 shrink-0 cursor-text items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-slate-400 transition-colors focus-within:border-accent-indigo/40 hover:border-border-strong sm:w-56"
        >
          <Search className="h-4 w-4 shrink-0" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Quick search"
            className="w-full min-w-0 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-border-strong bg-midnight px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Desktop tab row — on mobile the same tabs live in the hamburger drawer instead */}
      <div className="hidden border-t border-border md:flex md:h-11 md:items-center md:gap-1 md:overflow-x-auto md:px-6">
        {TAB_DEFS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab.id === activeTabId
                ? "bg-gradient-to-r from-accent-indigo to-accent-violet text-white shadow-glow-indigo"
                : "text-slate-400 hover:bg-surface-hover hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}
