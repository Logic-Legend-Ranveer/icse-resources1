import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, RotateCcw, Trophy } from "lucide-react";
import type { Question, QuizAttempt } from "../../types";
import { fetchQuizText } from "../../lib/api";
import { parseQuizTxt } from "../../lib/quizParser";
import { useUI } from "../../context/UIContext";
import ModalShell from "./ModalShell";

type Phase = "loading" | "error" | "configure" | "taking" | "results";

/** A parsed question tagged with which quiz file (chapter) it came from — used for the chapter-accuracy chart. */
interface CombinedQuestion extends Question {
  chapterName: string;
}

interface ChapterPool {
  chapterName: string;
  questions: Question[];
}

interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

interface BalancedPlan {
  perChapter: number;
  total: number;
  chapterCount: number;
  totalAvailable: number;
}

/**
 * Generates a chapter color on demand rather than picking from a fixed list —
 * each index is rotated by the golden angle (~137.5°) from the last, which
 * keeps colors maximally distinct from their neighbors whether there are 2
 * chapters or 23 (ICSE's max per subject), instead of two adjacent slots
 * landing on similar hues the way a short hand-picked list can.
 */
function getChapterColor(index: number): string {
  const hue = (200 + index * 137.508) % 360;
  const saturation = 62 + (index % 3) * 6; // 62 / 68 / 74, cycling
  const lightness = 52 + (index % 2) * 9; // 52 / 61, alternating
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Splits a requested total question count evenly across chapters. Rounds to
 * whichever multiple of the chapter count is closest (remainder > half the
 * divisor rounds up, otherwise down — e.g. 20 requested over 3 chapters:
 * 20 = 6*3 + 2, and since 2 > 3/2 it rounds up to 21 = 7*3, not down to 18),
 * then clamps to what's actually available so no chapter is asked for more
 * than it has.
 */
function computeBalancedPlan(requestedRaw: number, pools: ChapterPool[]): BalancedPlan {
  const chapterCount = pools.length;
  const totalAvailable = pools.reduce((sum, p) => sum + p.questions.length, 0);
  const minAvailable = Math.min(...pools.map((p) => p.questions.length));
  const requested = Math.max(chapterCount, Math.min(totalAvailable, requestedRaw));

  let perChapter = Math.floor(requested / chapterCount);
  const remainder = requested % chapterCount;
  if (remainder > chapterCount / 2) perChapter += 1;
  perChapter = Math.max(1, Math.min(perChapter, minAvailable));

  return { perChapter, total: perChapter * chapterCount, chapterCount, totalAvailable };
}

export default function QuizModal() {
  const { quizFiles, closeModal } = useUI();
  const [phase, setPhase] = useState<Phase>("loading");
  const [chapterPools, setChapterPools] = useState<ChapterPool[]>([]);
  const [countInput, setCountInput] = useState("");
  const [questions, setQuestions] = useState<CombinedQuestion[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [attempt, setAttempt] = useState<QuizAttempt>({});
  const [submittedIndices, setSubmittedIndices] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (quizFiles.length === 0) return;

    let cancelled = false;
    setPhase("loading");
    setChapterPools([]);
    setCountInput("");
    setQuestions([]);
    setAttempt({});
    setSubmittedIndices(new Set());
    setCurrentIndex(0);

    Promise.all(
      quizFiles.map((f) =>
        fetchQuizText(f.driveId)
          .then(parseQuizTxt)
          .then((qs): ChapterPool => ({ chapterName: f.name, questions: qs }))
      )
    )
      .then((pools) => {
        if (cancelled) return;
        const nonEmptyPools = pools.filter((p) => p.questions.length > 0);
        if (nonEmptyPools.length === 0) {
          setErrorMessage("The selected quiz file(s) contain no valid questions.");
          setPhase("error");
          return;
        }
        const totalAvailable = nonEmptyPools.reduce((sum, p) => sum + p.questions.length, 0);
        setChapterPools(nonEmptyPools);
        setCountInput(String(totalAvailable));
        setPhase("configure");
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

  const plan = useMemo<BalancedPlan | null>(() => {
    if (chapterPools.length === 0) return null;
    const parsed = parseInt(countInput, 10);
    const fallback = chapterPools.reduce((sum, p) => sum + p.questions.length, 0);
    return computeBalancedPlan(Number.isFinite(parsed) ? parsed : fallback, chapterPools);
  }, [countInput, chapterPools]);

  function handleStartQuiz() {
    if (!plan) return;
    let combined: CombinedQuestion[] = chapterPools.flatMap((pool) =>
      shuffleArray(pool.questions)
        .slice(0, plan.perChapter)
        .map((q) => ({ ...q, chapterName: pool.chapterName }))
    );
    // Combining multiple chapters into one attempt mixes their questions
    // together rather than running them as separate back-to-back blocks.
    if (chapterPools.length > 1) {
      combined = shuffleArray(combined);
    }
    // Re-index ids sequentially across the combined set — parseQuizTxt
    // numbers questions 1..n *within* each file, so ids would otherwise collide.
    combined = combined.map((q, i) => ({ ...q, id: i }));

    setQuestions(combined);
    setAttempt({});
    setSubmittedIndices(new Set());
    setCurrentIndex(0);
    setPhase("taking");
  }

  const currentQuestion = questions[currentIndex];
  const isCurrentSubmitted = submittedIndices.has(currentIndex);
  const isLastQuestion = currentIndex === questions.length - 1;
  const score = useMemo(() => questions.filter((q) => attempt[q.id] === q.correctAnswer).length, [questions, attempt]);
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const scoreTier: "success" | "warning" | "danger" = percentage >= 80 ? "success" : percentage >= 50 ? "warning" : "danger";

  // One slice per chapter, sized by how many of that chapter's questions were
  // answered correctly — only meaningful once more than one chapter is combined.
  const chapterSegments = useMemo<ChartSegment[]>(() => {
    if (chapterPools.length <= 1) return [];
    const correctByChapter = new Map<string, number>();
    questions.forEach((q) => {
      if (attempt[q.id] === q.correctAnswer) {
        correctByChapter.set(q.chapterName, (correctByChapter.get(q.chapterName) ?? 0) + 1);
      }
    });
    return chapterPools.map((pool, i) => ({
      label: pool.chapterName,
      value: correctByChapter.get(pool.chapterName) ?? 0,
      color: getChapterColor(i),
    }));
  }, [questions, attempt, chapterPools]);

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
      heightClassName="max-h-[min(720px,85vh)] md:max-h-[min(680px,85vh)]"
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

          {phase === "configure" && plan && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center md:gap-4">
              <p className="text-sm font-medium text-slate-100 md:text-base">How many questions would you like?</p>
              <p className="text-xs text-slate-500 md:text-sm">
                {plan.totalAvailable} available across {chapterPools.length} chapter{chapterPools.length === 1 ? "" : "s"}
                {chapterPools.length > 1 ? " · split evenly per chapter" : ""}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStartQuiz();
                }}
                className="flex flex-col items-center gap-3 md:gap-4"
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                  className="w-28 rounded-lg border border-border-strong bg-surface px-3 py-2 text-center text-lg font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-indigo/40 md:w-32 md:py-2.5 md:text-xl"
                />

                <p className="text-xs text-slate-600 md:text-sm">
                  {plan.total} question{plan.total === 1 ? "" : "s"}
                  {chapterPools.length > 1 ? ` (${plan.perChapter} per chapter)` : ""}
                </p>

                <button
                  type="submit"
                  className="mt-1 rounded-lg bg-gradient-to-r from-accent-indigo to-accent-violet px-6 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02] md:px-8 md:py-2.5 md:text-base"
                >
                  Start Quiz
                </button>
              </form>
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

              {chapterSegments.length > 0 && (
                <div className="mt-6 rounded-2xl border border-border bg-surface p-5 md:mt-8 md:p-6">
                  <p className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-500 md:text-sm">
                    Accuracy by chapter
                  </p>
                  <ChapterPieChart segments={chapterSegments} />
                </div>
              )}

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

function ChapterPieChart({ segments }: { segments: ChartSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const size = 140;
  const radius = size / 2;
  const center = size / 2;

  let cumulativeAngle = -90;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((segment) => {
      const fraction = total > 0 ? segment.value / total : 0;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + fraction * 360;
      cumulativeAngle = endAngle;
      return { segment, startAngle, endAngle, fraction };
    });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative shrink-0">
        <div
          className="absolute inset-[-20%] -z-10 rounded-full blur-2xl"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(100,116,139,0.18) 55%, transparent 75%)",
          }}
          aria-hidden="true"
        />
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="relative drop-shadow-[0_10px_24px_rgba(139,92,246,0.35)]"
        >
          {total === 0 ? (
            <circle cx={center} cy={center} r={radius - 1} fill="none" stroke="currentColor" strokeWidth={2} className="text-border-strong" />
          ) : (
            arcs.map(({ segment, startAngle, endAngle, fraction }) => {
              if (fraction >= 0.999) {
                return <circle key={segment.label} cx={center} cy={center} r={radius} fill={segment.color} />;
              }
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              const x1 = center + radius * Math.cos(startRad);
              const y1 = center + radius * Math.sin(startRad);
              const x2 = center + radius * Math.cos(endRad);
              const y2 = center + radius * Math.sin(endRad);
              const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
              return (
                <path
                  key={segment.label}
                  d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                  fill={segment.color}
                />
              );
            })
          )}
        </svg>
      </div>

      <ul className="w-full min-w-0 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2 text-xs text-slate-400 md:text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="min-w-0 flex-1 truncate">{segment.label}</span>
            <span className="shrink-0 text-slate-500">
              {segment.value} correct{total > 0 ? ` · ${Math.round((segment.value / total) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
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
