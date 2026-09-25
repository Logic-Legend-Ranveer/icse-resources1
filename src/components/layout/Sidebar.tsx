import { useEffect } from "react";
import { Atom, BookOpen, Calculator, Dna, FlaskConical, Globe2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SUBJECTS, FILE_TREE } from "../../data/sampleData";
import { useUI } from "../../context/UIContext";
import SidebarFileTree from "./SidebarFileTree";
import QuizModeButton from "../floating/QuizModeButton";

const SUBJECT_ICONS: Record<string, LucideIcon> = {
  biology: Dna,
  chemistry: FlaskConical,
  physics: Atom,
  mathematics: Calculator,
  english: BookOpen,
  "history-civics": Globe2,
};

interface SidebarProps {
  activeClassId: string;
  activeSubjectId: string;
  onSubjectChange: (subjectId: string) => void;
}

export default function Sidebar({ activeClassId, activeSubjectId, onSubjectChange }: SidebarProps) {
  const { sidebarOpen, closeSidebar } = useUI();

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") closeSidebar();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeSidebar]);

  const activeItems = FILE_TREE[activeClassId]?.[activeSubjectId] ?? [];

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
        className={`fixed bottom-0 left-0 top-16 z-40 flex w-72 flex-col border-r border-border bg-midnight transition-transform duration-200 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Subjects</p>
          <div className="flex flex-wrap gap-1.5 px-1 pb-5">
            {SUBJECTS.map((subject) => {
              const Icon = SUBJECT_ICONS[subject.id] ?? BookOpen;
              const isActive = subject.id === activeSubjectId;
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => onSubjectChange(subject.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-accent-indigo/40 bg-accent-indigo/15 text-accent-indigo-soft"
                      : "border-border bg-surface text-slate-400 hover:border-border-strong hover:bg-surface-hover hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {subject.name}
                </button>
              );
            })}
          </div>

          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-slate-500">File explorer</p>
          {activeItems.length === 0 ? (
            <p className="px-2 py-4 text-sm text-slate-500">No files yet for this subject.</p>
          ) : (
            <SidebarFileTree items={activeItems} depth={0} />
          )}
        </div>

        <div className="shrink-0 border-t border-border p-3">
          <QuizModeButton />
        </div>
      </aside>
    </>
  );
}
