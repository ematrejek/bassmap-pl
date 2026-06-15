import FanEventsTable from "@/components/fan/FanEventsTable";
import MyEventsSectionHeader from "@/components/fan/MyEventsSectionHeader";
import ProfileEventCard from "@/components/fan/ProfileEventCard";
import { Button } from "@/components/ui/button";
import { DISCOVERY_PATH, MY_EVENTS_NEW_PATH } from "@/lib/routes";
import { shellBtnPrimary, shellPanelFlat, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { Event } from "@/types";

interface Props {
  /** Zgłoszenia własne (Dodaję) – z bazy. */
  submittedEvents: Event[];
  submitted?: boolean;
}

function pluralEvents(count: number): string {
  if (count === 1) {
    return "event";
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "eventy";
  }
  return "eventów";
}

function pluralSubmissions(count: number): string {
  if (count === 1) {
    return "zgłoszenie";
  }
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "zgłoszenia";
  }
  return "zgłoszeń";
}

function EmptyAttendingPanel({ message }: { message: string }) {
  return (
    <div className={cn("p-8 text-center", shellPanelFlat, shellTextMuted)}>
      <p className="text-sm">{message}</p>
      <Button asChild className={cn(shellBtnPrimary, "mt-4")}>
        <a href={DISCOVERY_PATH}>Przeglądaj listę eventów</a>
      </Button>
    </div>
  );
}

export default function MyEventsPage({ submittedEvents, submitted = false }: Props) {
  // Placeholder – slice «Idę» / «Obserwuję» (RSVP) w przyszłości.
  const goingEvents: Event[] = [];
  const watchingEvents: Event[] = [];

  return (
    <div className="space-y-14">
      <MyEventsSectionHeader
        title="Idę"
        count={goingEvents.length}
        countLabel={pluralEvents(goingEvents.length)}
        id="ide"
      >
        {goingEvents.length === 0 ? (
          <EmptyAttendingPanel message="Nie masz jeszcze wydarzeń z «Idę». Otwórz stronę imprezy i zaznacz, że idziesz – pojawi się tutaj." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {goingEvents.map((event) => (
              <ProfileEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </MyEventsSectionHeader>

      <MyEventsSectionHeader
        title="Obserwuję"
        count={watchingEvents.length}
        countLabel={pluralEvents(watchingEvents.length)}
        id="obserwuje"
      >
        {watchingEvents.length === 0 ? (
          <EmptyAttendingPanel message="Nie obserwujesz jeszcze żadnych wydarzeń. Kliknij «Obserwuję» na stronie imprezy – zobaczysz ją tutaj." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {watchingEvents.map((event) => (
              <ProfileEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </MyEventsSectionHeader>

      <div className="flex justify-end">
        <Button asChild className={shellBtnPrimary}>
          <a href={MY_EVENTS_NEW_PATH}>Dodaj wydarzenie</a>
        </Button>
      </div>

      <MyEventsSectionHeader
        title="Dodaję"
        count={submittedEvents.length}
        countLabel={pluralSubmissions(submittedEvents.length)}
        id="dodaje"
      >
        <FanEventsTable events={submittedEvents} submitted={submitted} />
      </MyEventsSectionHeader>
    </div>
  );
}
