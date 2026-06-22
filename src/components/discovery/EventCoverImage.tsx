import { getCoverAspectClassName } from "@/lib/storage/event-covers";
import { cn } from "@/lib/utils";
import type { CoverAspect } from "@/types";

type Variant = "thumb" | "preview" | "hero";

const VARIANT_CLASSES: Record<Variant, string> = {
  thumb: "size-14 shrink-0 rounded-lg",
  preview: "w-full",
  hero: "w-full rounded-xl",
};

const FALLBACK_TEXT: Record<Variant, string> = {
  thumb: "text-xs",
  preview: "text-base",
  hero: "text-lg",
};

/** Placeholder bez pliku – kompaktowy landscape (nie pełna szerokość jak prawdziwy hero). */
function getPlaceholderLayoutClass(variant: Variant): string {
  switch (variant) {
    case "thumb":
      return "";
    case "hero":
      return "aspect-video w-full";
    case "preview":
      return "aspect-video w-full max-w-md";
  }
}

interface Props {
  coverUrl: string | null;
  alt: string;
  className?: string;
  variant?: Variant;
  coverAspect?: CoverAspect | null;
}

export default function EventCoverImage({ coverUrl, alt, className, variant = "thumb", coverAspect = null }: Props) {
  const baseClass = cn(VARIANT_CLASSES[variant], className);
  const aspectClass = coverUrl
    ? variant === "thumb"
      ? ""
      : getCoverAspectClassName(coverAspect)
    : getPlaceholderLayoutClass(variant);

  if (!coverUrl) {
    return (
      <div
        className={cn(
          baseClass,
          aspectClass,
          "from-primary/80 to-accent/80 text-primary-foreground flex items-center justify-center bg-gradient-to-br font-bold",
          FALLBACK_TEXT[variant],
        )}
        aria-hidden={variant !== "hero"}
      >
        DnB
      </div>
    );
  }

  return (
    <img
      src={coverUrl}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(baseClass, aspectClass, "object-cover")}
    />
  );
}
