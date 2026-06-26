import { Button } from "@/components/ui/button";
import type { CrewJoinRequest } from "@/types";
import { fanPublicProfilePath } from "@/lib/routes";
import { Check, X } from "lucide-react";

interface Props {
  requests: CrewJoinRequest[];
  pendingAction: string | null;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

function RequesterLink({ request }: { request: CrewJoinRequest }) {
  if (request.requesterLogin) {
    return (
      <a href={fanPublicProfilePath(request.requesterLogin)} className="text-primary font-semibold hover:underline">
        @{request.requesterLogin}
      </a>
    );
  }

  return <span className="text-muted-foreground font-semibold">Fan bez publicznego loginu</span>;
}

export default function CrewRequestsList({ requests, pendingAction, onAccept, onDecline }: Props) {
  if (requests.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
        Brak oczekujących próśb o dołączenie.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li key={request.id} className="border-border bg-background/40 rounded-xl border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <RequesterLink request={request} />
              <p className="text-muted-foreground mt-1 text-xs">
                Prośba z {new Date(request.createdAt).toLocaleDateString("pl-PL")}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onAccept(request.id);
                }}
                disabled={pendingAction !== null}
                className="font-semibold tracking-wider uppercase"
              >
                <Check className="h-4 w-4" />
                Akceptuj
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onDecline(request.id);
                }}
                disabled={pendingAction !== null}
                className="font-semibold tracking-wider uppercase"
              >
                <X className="h-4 w-4" />
                Odrzuć
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
