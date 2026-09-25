import { GraduationCap } from "lucide-react";

interface QuizSelectionBarProps {
  count: number;
  onAttempt: () => void;
}

export default function QuizSelectionBar({ count, onAttempt }: QuizSelectionBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-midnight/95 backdrop-blur-xl md:pl-64">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-slate-100">{count}</span> quiz{count === 1 ? "" : "zes"} selected
        </p>
        <button
          type="button"
          onClick={onAttempt}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-indigo to-accent-violet px-4 py-2 text-sm font-medium text-white shadow-glow-indigo transition-transform hover:scale-[1.02]"
        >
          <GraduationCap className="h-4 w-4" />
          Attempt Quiz
        </button>
      </div>
    </div>
  );
}
