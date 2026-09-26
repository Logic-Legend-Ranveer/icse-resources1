import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, RotateCcw, Trophy } from "lucide-react";
import type { Question, QuizAttempt } from "../../types";
import { fetchQuizText } from "../../lib/api";
import { parseQuizTxt } from "../../lib/quizParser";
import { useUI } from "../../context/UIContext";
import ModalShell from "./ModalShell";

type Phase = "loading" | "error" | "taking" | "results";

export default function QuizModal() {
  const { quizFiles, closeModal } = useUI();
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState<QuizAttempt>({});
  const [submittedIndices, setSubmittedIndices] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (quizFiles.length === 0) return;

    let cancelled = false;
    setPhase("loading");
    setQuestions([]);
    setAttempt({});
    setSubmittedIndices(new Set());
    setCurrentIndex(0);

    Promise.all(quizFiles.map((f) => fetchQuizText(f.driveId).then(parseQuizTxt)))
      .then((parsedPerFile) => {
        if (cancelled) return;
        // Re-index ids sequentially across the combined set — parseQuizTxt
        // numbers questions 1..n *within* each file, so ids collide once
        // multiple files are combined into one attempt.
        const combined = parsedPerFile.flat().map((q, i) => ({ ...q, id: i }));
        if (combined.length === 0) {
          setErrorMessage("The selected quiz file(s) contain no valid questions.");
          setPhase("error");
          return;
        }
        setQuestions(combined);
        setPhase("taking");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMessage(err.message || "Failed to load the selected quiz(zes).");
        setPhase("error");
      });

    return () => {
      cancelled = true;
    };
  }, [quizFiles]);

  const currentQuestion = questions[currentIndex];
  const isCurrentSubmitted = submittedIndices.has(currentIndex);
  const isLastQuestion = currentIndex === questions.length - 1;
  const score = useMemo(() => questions.filter((q) => attempt[q.id] === q.correctAnswer).length, [questions, attempt]);
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const scoreTier: "success" | "warning" | "danger" = percentage >= 80 ? "success" : percentage >= 50 ? "warning" : "danger";

  function handleSelectOption(optionIndex: number) {
    if (!currentQuestion || submittedIndices.has(currentIndex)) return;
    setAttempt((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  }

  function handleSubmitCurrent() {
    if (!currentQuestion || attempt[currentQuestion.id] === undefined) return;
    setSubmittedIndices((prev) => new Set(prev).add(currentIndex));
  }

  function handlePrevious() {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }

  function handleNext() {
    if (!submittedIndices.has(currentIndex)) return;
    if (isLastQuestion) {
      setPhase("results");
    } else {
      setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
    }
  }

  // A/B/C/D select an option, Enter submits it, → advances (or finishes on
  // the last question), ← goes back. Only active while actually taking the quiz.
  useEffect(() => {
    if (phase !== "taking") return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (["a", "b", "c", "d"].includes(key)) {
        e.preventDefault();
        handleSelectOption(key.charCodeAt(0) - 97);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSubmitCurrent();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex, submittedIndices, attempt, questions]);

  if (quizFiles.length === 0) return null;

  const subject = quizFiles[0]?.subject ?? "Quiz";
  const title = quizFiles.length === 1 ? quizFiles[0].name : `${subject} — ${quizFiles.length} chapters combined`;

  return (
    <ModalShell
      title={title}
      onClose={closeModal}
      widthClassName="w-[95vw] max-w-2xl md:max-w-3xl"
      heightClassName="h-[min(720px,85vh)] md:h-auto md:max-h-[min(680px,85vh)]"
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {phase === "loading" && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-accent-indigo-soft md:h-7 md:w-7" />
              <p className="text-sm md:text-base">Loading quiz…</p>
            </div>
          )}

          {phase === "error" && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-slate-500">
              <AlertTriangle className="h-6 w-6 text-danger md:h-7 md:w-7" />
              <p className="text-sm md:text-base">{errorMessage}</p>
            </div>
          )}

          {phase === "taking" && currentQuestion && (
            <div className="p-5 md:p-6">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-500 md:mb-4 md:text-sm">
                <span>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span>{subject}</span>
              </div>

              <QuestionBlock
                index={currentIndex}
                question={currentQuestion}
                selectedIndex={attempt[currentQuestion.id]}
                revealAnswer={isCurrentSubmitted}
                onSelect={handleSelectOption}
              />

              {!isCurrentSubmitted && (
                <div className="mt-3 flex items-center justify-end gap-2 md:mt-4">
                  <p className="mr-auto text-xs text-slate-600 md:text-sm">
                    Press <kbd className="rounded border border-border-strong bg-surface px-1 font-mono md:px-1.5">A</kbd>–
                    <kbd className="rounded border border-border-strong bg-surface px-1 font-mono md:px-1.5">D</kbd> to answer,{" "}
                    <kbd className="rounded border border-border-strong bg-surface px-1 font-mono md:px-1.5">Enter</kbd> to submit
                  </p>
                  <button
                    type="button"
                    disabled={attempt[currentQuestion.id] === undefined}
                    onClick={handleSubmitCurrent}
                    className="rounded-lg border border-border-strong bg-surface-hover px-4 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 md:px-5 md:py-2 md:text-sm"
                  >
                    Submit Answer
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === "results" && (
            <div className="p-5 md:p-6">
              <ScoreSummary score={score} total={questions.length} percentage={percentage} tier={scoreTier} />

              <p className="mb-3 mt-6 text-xs font-medium uppercase tracking-wider text-slate-500 md:mb-4 md:mt-8 md:text-sm">
                Review your answers
              </p>
              <div className="space-y-4 md:space-y-5">
                {questions.map((question, index) => (
                  <QuestionBlock
                    key={question.id}
                    index={index}
                    question={question}
                    selectedIndex={attempt[question.id]}
                    revealAnswer
                    onSelect={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {phase === "taking" && (
          <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3 md:px-6 md:py-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={handlePrevious}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 md:px-5 md:py-2 md:text-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={!isCurrentSubmitted}
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-indigo to-accent-violet px-4 py-1.5 text-xs font-medium text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 md:px-5 md:py-2 md:text-sm"
            >
              {isLastQuestion ? "Finish & See Score" : "Next"}
              <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </button>
          </div>
        )}

        {phase === "results" && (
          <div className="flex shrink-0 items-center justify-end border-t border-border px-5 py-3 md:px-6 md:py-4">
            <button
              type="button"
              onClick={() => {
                setAttempt({});
                setSubmittedIndices(new Set());
                setCurrentIndex(0);
                setPhase("taking");
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-hover md:px-5 md:py-2 md:text-sm"
            >
              <RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Retry
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function ScoreSummary({
  score,
  total,
  percentage,
  tier,
}: {
  score: number;
  total: number;
  percentage: number;
  tier: "success" | "warning" | "danger";
}) {
  const tierClasses = {
    success: "border-success/40 bg-success/10 text-success-soft",
    warning: "border-warning/40 bg-warning/10 text-warning-soft",
    danger: "border-danger/40 bg-danger/10 text-danger-soft",
  }[tier];

  return (
    <div className={`flex flex-col items-center gap-2 rounded-2xl border px-6 py-8 text-center md:gap-3 md:px-8 md:py-10 ${tierClasses}`}>
      <Trophy className="h-7 w-7 md:h-9 md:w-9" />
      <p className="text-3xl font-semibold md:text-4xl">{percentage}%</p>
      <p className="text-sm text-slate-300 md:text-base">
        You scored <span className="font-semibold text-slate-100">{score}</span> out of{" "}
        <span className="font-semibold text-slate-100">{total}</span>
      </p>
    </div>
  );
}

interface QuestionBlockProps {
  index: number;
  question: Question;
  selectedIndex: number | undefined;
  /** true once this question is locked in — shows correct/incorrect coloring and disables the options. */
  revealAnswer: boolean;
  onSelect: (optionIndex: number) => void;
}

function QuestionBlock({ index, question, selectedIndex, revealAnswer, onSelect }: QuestionBlockProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 md:rounded-2xl md:p-6">
      <p className="mb-3 text-sm font-medium text-slate-100 md:mb-4 md:text-base">
        {index + 1}. {question.question}
      </p>
      <div className="space-y-2 md:space-y-2.5">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedIndex === optionIndex;
          const isCorrect = optionIndex === question.correctAnswer;
          const letter = String.fromCharCode(65 + optionIndex);

          let stateClasses = "border-border bg-midnight text-slate-300 hover:bg-surface-hover";
          if (revealAnswer) {
            if (isCorrect) {
              stateClasses = "border-success/50 bg-success/10 text-success-soft";
            } else if (isSelected) {
              stateClasses = "border-danger/50 bg-danger/10 text-danger-soft";
            } else {
              stateClasses = "border-border bg-midnight text-slate-500";
            }
          } else if (isSelected) {
            stateClasses = "border-accent-indigo/40 bg-accent-indigo/15 text-accent-indigo-soft";
          }

          return (
            <button
              key={optionIndex}
              type="button"
              disabled={revealAnswer}
              onClick={() => onSelect(optionIndex)}
              className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default md:gap-3 md:rounded-xl md:px-4 md:py-3 md:text-base ${stateClasses}`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-current/40 text-[10px] font-semibold md:h-6 md:w-6 md:text-xs">
                {letter}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {revealAnswer && question.explanation && (
        <p className="mt-3 rounded-lg bg-info/10 px-3 py-2 text-xs leading-relaxed text-info-soft md:mt-4 md:rounded-xl md:px-4 md:py-3 md:text-sm">
          {question.explanation}
        </p>
      )}
    </div>
  );
}
