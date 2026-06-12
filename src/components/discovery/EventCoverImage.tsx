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
  preview: "text-lg",
  hero: "text-2xl",
};

interface Props {
  coverUrl: string | null;
  alt: string;
  className?: string;
  variant?: Variant;
  coverAspect?: CoverAspect | null;
}

export default function EventCoverImage({ coverUrl, alt, className, variant = "thumb", coverAspect = null }: Props) {
  const baseClass = cn(VARIANT_CLASSES[variant], className);
  const aspectClass = variant === "thumb" ? "" : getCoverAspectClassName(coverAspect);

  if (!coverUrl) {
    return (
      <div
        className={cn(
          baseClass,
          aspectClass,
          "flex items-center justify-center bg-gradient-to-br from-purple-600/80 to-blue-600/80 font-bold text-white",
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
