import { Equalizer } from "@/components/shell/Equalizer";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  title: string;
  count: number;
  countLabel: string;
  id?: string;
  children: ReactNode;
  className?: string;
}

export default function MyEventsSectionHeader({ title, count, countLabel, id, children, className }: Props) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Equalizer bars={4} className="text-accent h-4" />
        <h2 className="font-heading text-foreground text-2xl font-bold tracking-tight uppercase">{title}</h2>
        <span className="border-border bg-card/60 text-muted-foreground rounded-full border px-2.5 py-0.5 font-mono text-xs">
          {count} {countLabel}
        </span>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
