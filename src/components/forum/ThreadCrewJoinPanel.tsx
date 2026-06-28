import { useEffect, useState } from "react";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import { readApiError } from "@/lib/api/json";
import { shellBtnPrimary } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { Crew, CrewJoinRequest } from "@/types";

interface CrewViewerState {
  crew: Crew;
  isMember: boolean;
  pendingRequest: CrewJoinRequest | null;
}

interface Props {
  crewId: string;
  initialCrew?: Crew | null;
}

export function ThreadCrewJoinPanel({ crewId, initialCrew }: Props) {
  const [state, setState] = useState<CrewViewerState | null>(
    initialCrew ? { crew: initialCrew, isMember: false, pendingRequest: null } : null,
  );
  const [isLoading, setIsLoading] = useState(!initialCrew);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCrewContext() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/fan/crews/${crewId}`, {
          credentials: "include",
        });
        const data: unknown = await response.json();

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setError(readApiError(data) ?? "Nie udało się załadować ekipy");
          return;
        }

        const payload = data as {
          crew: Crew;
          isMember: boolean;
          pendingRequest: CrewJoinRequest | null;
        };

        setState({
          crew: payload.crew,
          isMember: payload.isMember,
          pendingRequest: payload.pendingRequest,
        });
      } catch {
        if (isMounted) {
          setError("Nie udało się załadować ekipy");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCrewContext();

    return () => {
      isMounted = false;
    };
  }, [crewId]);

  async function handleRequestJoin() {
    setError(null);
    setPendingAction(true);

    try {
      const response = await fetch(`/api/fan/crews/${crewId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się wysłać prośby");
        return;
      }

      const request = (data as { request: CrewJoinRequest }).request;
      setState((current) =>
        current
          ? {
              ...current,
              pendingRequest: request,
            }
          : current,
      );
    } catch {
      setError("Nie udało się wysłać prośby");
    } finally {
      setPendingAction(false);
    }
  }

  if (isLoading) {
    return (
      <div className="surface-panel-flat p-5">
        <p className="text-muted-foreground text-sm">Ładowanie ekipy…</p>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="surface-panel-flat p-5">
        <ServerError message={error} />
      </div>
    );
  }

  if (!state) {
    return null;
  }

  const { crew, isMember, pendingRequest } = state;
  const showJoinButton = !isMember && !pendingRequest;

  return (
    <div className="surface-panel-flat space-y-4 p-5">
      <div>
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">Powiązana ekipa</p>
        <h2 className="font-heading text-foreground mt-1 text-lg font-black uppercase">{crew.name}</h2>
        {crew.city ? <p className="text-muted-foreground mt-1 text-sm">{crew.city}</p> : null}
        {crew.description ? (
          <p className="text-foreground mt-3 text-sm leading-relaxed whitespace-pre-wrap">{crew.description}</p>
        ) : null}
      </div>

      {error ? <ServerError message={error} /> : null}

      {isMember ? (
        <p className="text-muted-foreground text-sm">Jesteś już członkiem tej ekipy.</p>
      ) : pendingRequest ? (
        <p className="text-muted-foreground text-sm">Prośba o dołączenie oczekuje na odpowiedź właściciela.</p>
      ) : showJoinButton ? (
        <Button
          type="button"
          className={cn(shellBtnPrimary)}
          disabled={pendingAction}
          onClick={() => void handleRequestJoin()}
        >
          {pendingAction ? "Wysyłanie…" : "Poproś o dołączenie"}
        </Button>
      ) : null}
    </div>
  );
}
