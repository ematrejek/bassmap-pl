import EventCardSubgenreBadges from "@/components/discovery/EventCardSubgenreBadges";
import { Button } from "@/components/ui/button";
import { shellBtnPrimary } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { JoinableCrew } from "@/types";
import { Loader2, Users } from "lucide-react";

interface Props {
  crews: JoinableCrew[];
  pendingAction: string | null;
  onRequestJoin: (crewId: string) => void;
}

export default function CrewJoinableList({ crews, pendingAction, onRequestJoin }: Props) {
  if (crews.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
        Na razie nie ma innych ekip do których możesz dołączyć. Sprawdź też forum w dziale ekipowym.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {crews.map(({ crew, pendingRequest }) => {
        const isPending = pendingRequest !== null;
        const isSubmitting = pendingAction === `request:${crew.id}`;

        return (
          <li key={crew.id} className="border-border bg-background/40 rounded-xl border p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Users className="text-accent mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="font-heading text-foreground text-lg font-bold tracking-tight uppercase">
                    {crew.name}
                  </h3>
                  {crew.city ? <p className="text-muted-foreground text-sm">{crew.city}</p> : null}
                </div>
              </div>

              {crew.subgenres.length > 0 ? <EventCardSubgenreBadges subgenres={crew.subgenres} /> : null}

              {crew.description ? (
                <p className="text-foreground/90 line-clamp-3 text-sm leading-relaxed">{crew.description}</p>
              ) : null}

              {isPending ? (
                <p className="text-muted-foreground text-sm">Prośba o dołączenie oczekuje na odpowiedź właściciela.</p>
              ) : (
                <Button
                  type="button"
                  className={cn(shellBtnPrimary)}
                  disabled={pendingAction !== null}
                  onClick={() => {
                    onRequestJoin(crew.id);
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Wysyłanie…
                    </>
                  ) : (
                    "Poproś o dołączenie"
                  )}
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
