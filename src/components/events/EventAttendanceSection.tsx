import { ServerError } from "@/components/auth/ServerError";
import EventRsvpButtons from "@/components/events/EventRsvpButtons";
import { useEventAttendance } from "@/components/hooks/useEventAttendance";
import { SIGN_IN_PATH } from "@/lib/routes";
import { shellLink, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types";
import { Star, Users } from "lucide-react";

interface Props {
  eventId: string;
  isUpcoming: boolean;
  initialGoingCount: number;
  initialInterestedCount: number;
  initialUserStatus: AttendanceStatus | null;
  isLoggedIn: boolean;
  redirectPath: string;
}

export default function EventAttendanceSection({
  eventId,
  isUpcoming,
  initialGoingCount,
  initialInterestedCount,
  initialUserStatus,
  isLoggedIn,
  redirectPath,
}: Props) {
  const signInHref = `${SIGN_IN_PATH}?redirect=${encodeURIComponent(redirectPath)}`;
  const canMutate = isUpcoming && isLoggedIn;

  const { goingCount, interestedCount, userStatus, pendingStatus, error, handleStatusClick } = useEventAttendance({
    eventId,
    initialGoingCount,
    initialInterestedCount,
    initialUserStatus,
  });

  return (
    <div className="mt-5 space-y-3">
      {canMutate ? (
        <EventRsvpButtons
          userStatus={userStatus}
          pendingStatus={pendingStatus}
          onGoingClick={() => {
            void handleStatusClick("going");
          }}
          onInterestedClick={() => {
            void handleStatusClick("interested");
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={cn("flex flex-wrap items-center gap-4 text-sm", shellTextMuted)}>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" aria-hidden />
            <span className="text-foreground font-semibold">{goingCount}</span>
            Idzie
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-4 w-4" aria-hidden />
            <span className="text-foreground font-semibold">{interestedCount}</span>
            Interesuje się
          </span>
        </div>

        {!isLoggedIn && isUpcoming ? (
          <p className={cn("text-sm", shellTextMuted)}>
            <a href={signInHref} className={cn(shellLink, "font-medium hover:underline")}>
              Zaloguj się
            </a>
            , aby oznaczyć udział
          </p>
        ) : null}
      </div>

      {error ? <ServerError message={error} /> : null}
    </div>
  );
}
