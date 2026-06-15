import { cn } from "@/lib/utils";

export type NeonColor = "violet" | "cyan" | "green" | "orange";

const COLOR_MAP: Record<NeonColor, string> = {
  violet: "border-primary/40 bg-primary/10 text-primary [--ring-glow:oklch(0.62_0.25_300_/_0.5)]",
  cyan: "border-accent/40 bg-accent/10 text-accent [--ring-glow:oklch(0.85_0.2_195_/_0.5)]",
  green: "border-neon-green/40 bg-neon-green/10 text-neon-green",
  orange: "border-neon-orange/40 bg-neon-orange/10 text-neon-orange",
};

interface Props {
  children: React.ReactNode;
  color?: NeonColor;
  className?: string;
}

export default function GenreBadge({ children, color = "violet", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[0.7rem] font-bold tracking-widest uppercase",
        COLOR_MAP[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
