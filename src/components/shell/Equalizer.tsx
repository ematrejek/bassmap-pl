import { cn } from "@/lib/utils";

const DELAYS = ["0ms", "150ms", "300ms", "450ms", "600ms", "200ms", "500ms"];

export function Equalizer({
  bars = 4,
  className,
  barClassName,
}: {
  bars?: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <span className={cn("eq-rack", className)} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className={cn("eq-bar", barClassName)} style={{ animationDelay: DELAYS[i % DELAYS.length] }} />
      ))}
    </span>
  );
}
