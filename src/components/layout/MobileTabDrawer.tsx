import { useEffect } from "react";
import { useUI } from "../../context/UIContext";
import { TAB_DEFS } from "../../data/tabs";
import type { TabId } from "../../data/tabs";

interface MobileTabDrawerProps {
  activeTabId: TabId;
  onSelectTab: (tabId: TabId) => void;
}

export default function MobileTabDrawer({ activeTabId, onSelectTab }: MobileTabDrawerProps) {
  const { sidebarOpen, closeSidebar } = useUI();

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") closeSidebar();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeSidebar]);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 top-16 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-16 z-40 flex w-72 flex-col gap-2 overflow-y-auto border-r border-border bg-midnight p-3 transition-transform duration-200 ease-out md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {TAB_DEFS.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onSelectTab(tab.id);
                closeSidebar();
              }}
              className={`flex w-full items-center rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-colors ${
                isActive
                  ? "border-accent-indigo/40 bg-accent-indigo/15 text-accent-indigo-soft"
                  : "border-border bg-surface text-slate-400 hover:bg-surface-hover hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </aside>
    </>
  );
}
