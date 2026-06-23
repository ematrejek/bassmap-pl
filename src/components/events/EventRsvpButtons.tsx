import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";
import { Check, Star } from "lucide-react";

const rsvpBtnBase = "font-semibold uppercase tracking-wider transition-all";

interface Props {
  userStatus: AttendanceStatus | null;
  pendingStatus: AttendanceStatus | null;
  disabled?: boolean;
  onGoingClick: () => void;
  onInterestedClick: () => void;
}

export default function EventRsvpButtons({
  userStatus,
  pendingStatus,
  disabled = false,
  onGoingClick,
  onInterestedClick,
}: Props) {
  const isGoing = userStatus === "going";
  const isInterested = userStatus === "interested";

  return (
    <div className="border-border/70 grid grid-cols-2 gap-2 border-t pt-4">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled || pendingStatus !== null}
        aria-pressed={isGoing}
        onClick={onGoingClick}
        className={cn(
          rsvpBtnBase,
          isGoing
            ? "bg-neon-green shadow-glow-green hover:bg-neon-green text-[oklch(0.14_0.02_280)]"
            : "hover:border-neon-green hover:text-neon-green",
        )}
      >
        <Check className="h-4 w-4" />
        {pendingStatus === "going" ? "Zapisywanie…" : "Idę"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled || pendingStatus !== null}
        aria-pressed={isInterested}
        onClick={onInterestedClick}
        className={cn(
          rsvpBtnBase,
          isInterested
            ? "bg-accent text-accent-foreground shadow-glow-cyan hover:bg-accent"
            : "hover:border-accent hover:text-accent",
        )}
      >
        <Star className={cn("h-4 w-4", isInterested && "fill-current")} />
        {pendingStatus === "interested" ? "Zapisywanie…" : "Interesuję się"}
      </Button>
    </div>
  );
}
