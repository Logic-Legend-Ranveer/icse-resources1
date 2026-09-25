/**
 * There's no real per-class data split yet, so this is intentionally static:
 * Class 10 always reads as active, Class 9 is a non-functioning placeholder
 * (disabled, "(Coming soon)") until there's real Class 9 content to switch to.
 */
export default function ClassSelector() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="cursor-not-allowed rounded-xl border border-border bg-surface px-4 py-3 text-left opacity-50"
      >
        <p className="text-sm font-semibold text-slate-300">Class 9</p>
        <p className="mt-0.5 text-xs text-slate-500">(Coming soon)</p>
      </button>

      <div className="rounded-xl border border-accent-indigo/40 bg-gradient-to-br from-accent-indigo/15 to-accent-violet/10 px-4 py-3 text-left shadow-glow-indigo">
        <p className="text-sm font-semibold text-slate-100">Class 10</p>
        <p className="mt-0.5 text-xs text-slate-500">Board exam year</p>
      </div>
    </div>
  );
}
