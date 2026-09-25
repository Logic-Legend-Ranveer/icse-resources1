import { GraduationCap } from "lucide-react";
import { useUI } from "../../context/UIContext";

export default function QuizModeButton() {
  const { openQuizModal } = useUI();

  return (
    <button
      type="button"
      onClick={openQuizModal}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-indigo to-accent-violet px-4 py-2.5 text-sm font-medium text-white shadow-glow-indigo transition-transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <GraduationCap className="h-4 w-4" />
      Quiz Mode
    </button>
  );
}
