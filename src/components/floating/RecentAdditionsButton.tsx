import { Clock } from "lucide-react";
import { useUI } from "../../context/UIContext";

export default function RecentAdditionsButton() {
  const { openRecentAdditions } = useUI();

  return (
    <button
      type="button"
      onClick={openRecentAdditions}
      className="fixed right-4 top-20 z-20 flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs font-medium text-slate-400 shadow-panel backdrop-blur-xl transition-colors hover:border-border-strong hover:text-highlight-soft md:right-6 md:top-[124px]"
    >
      <span className="relative flex items-center">
        <Clock className="h-3.5 w-3.5" />
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-highlight" />
      </span>
      Recent additions
    </button>
  );
}
