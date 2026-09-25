import { Hammer } from "lucide-react";

export default function AboutPanel() {
  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center gap-3 pt-20 text-center md:pt-14">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-slate-500">
        <Hammer className="h-5 w-5" />
      </span>
      <p className="text-sm text-slate-400">Under development</p>
    </section>
  );
}
