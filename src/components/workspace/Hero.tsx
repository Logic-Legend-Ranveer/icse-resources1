import { Files } from "lucide-react";

interface HeroProps {
  resourceCount: number;
}

export default function Hero({ resourceCount }: HeroProps) {
  return (
    <section className="pt-20 md:pt-14">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
        Study materials.{" "}
        <span className="bg-gradient-to-r from-accent-indigo-soft to-accent-violet-soft bg-clip-text text-transparent">
          Made simple.
        </span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
        A free, open-source hub of ICSE notes, worksheets, and practice quizzes — organized by class and
        subject so you can find what you need and get back to studying.
      </p>

      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-slate-400">
        <Files className="h-3.5 w-3.5 text-accent-indigo-soft" />
        <span className="font-semibold text-slate-200">{resourceCount.toLocaleString()}</span>
        resources available
      </div>
    </section>
  );
}
