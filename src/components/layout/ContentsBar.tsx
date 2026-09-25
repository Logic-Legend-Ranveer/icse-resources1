import { Atom, BookOpen, Calculator, Dna, FlaskConical, Globe2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FileItem } from "../../types";

const CARD_ICONS: Record<string, LucideIcon> = {
  biology: Dna,
  chemistry: FlaskConical,
  physics: Atom,
  mathematics: Calculator,
  english: BookOpen,
  "history & civics": Globe2,
};

function iconForCard(name: string): LucideIcon {
  return CARD_ICONS[name.trim().toLowerCase()] ?? BookOpen;
}

interface ContentsBarProps {
  items: FileItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  variant: "sidebar" | "inline";
}

export default function ContentsBar({ items, activeId, onSelect, variant }: ContentsBarProps) {
  if (items.length === 0) return null;

  if (variant === "sidebar") {
    return (
      <aside className="fixed bottom-0 left-0 top-[108px] z-40 hidden w-64 flex-col gap-2 overflow-y-auto border-r border-border bg-midnight p-3 md:flex">
        {items.map((item) => (
          <CardButton key={item.id} item={item} isActive={item.id === activeId} onClick={() => onSelect(item.id)} orientation="vertical" />
        ))}
      </aside>
    );
  }

  return (
    <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:hidden">
      {items.map((item) => (
        <CardButton key={item.id} item={item} isActive={item.id === activeId} onClick={() => onSelect(item.id)} orientation="horizontal" />
      ))}
    </div>
  );
}

function CardButton({
  item,
  isActive,
  onClick,
  orientation,
}: {
  item: FileItem;
  isActive: boolean;
  onClick: () => void;
  orientation: "vertical" | "horizontal";
}) {
  const Icon = iconForCard(item.name);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
        orientation === "horizontal" ? "min-w-[9.5rem]" : "w-full"
      } ${
        isActive
          ? "border-accent-indigo/40 bg-accent-indigo/15 text-accent-indigo-soft"
          : "border-border bg-surface text-slate-400 hover:border-border-strong hover:bg-surface-hover hover:text-slate-200"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.name}</span>
    </button>
  );
}
