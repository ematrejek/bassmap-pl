import { useFriends } from "@/components/hooks/useFriends";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FriendProfileSummary, FriendRequestSummary, FriendSummary } from "@/lib/services/friends";
import { fanPublicProfilePath } from "@/lib/routes";
import { Check, Loader2, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import type { SyntheticEvent } from "react";
import { useState } from "react";

function ProfileLink({ profile }: { profile: FriendProfileSummary }) {
  if (profile.login) {
    return (
      <a href={fanPublicProfilePath(profile.login)} className="text-primary font-semibold hover:underline">
        @{profile.login}
      </a>
    );
  }

  return <span className="text-muted-foreground font-semibold">Fan bez publicznego loginu</span>;
}

function EmptyState({ children }: { children: string }) {
  return <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">{children}</p>;
}

function FriendCard({
  friend,
  pendingAction,
  onRemove,
}: {
  friend: FriendSummary;
  pendingAction: string | null;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="border-border bg-background/40 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <ProfileLink profile={friend.user} />
        <p className="text-muted-foreground mt-1 text-xs">
          Znajomi od {new Date(friend.acceptedAt).toLocaleDateString("pl-PL")}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          onRemove(friend.id);
        }}
        disabled={pendingAction === `delete:${friend.id}`}
        className="font-semibold tracking-wider uppercase"
      >
        <Trash2 className="h-4 w-4" />
        Usuń
      </Button>
    </li>
  );
}

function RequestCard({
  request,
  direction,
  pendingAction,
  onAccept,
  onDecline,
}: {
  request: FriendRequestSummary;
  direction: "incoming" | "outgoing";
  pendingAction: string | null;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const profile = direction === "incoming" ? request.requester : request.addressee;

  return (
    <li className="border-border bg-background/40 rounded-xl border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <ProfileLink profile={profile} />
          <p className="text-muted-foreground mt-1 text-xs">
            {direction === "incoming" ? "Chce dodać Cię do znajomych" : "Czeka na odpowiedź"}
          </p>
        </div>

        {direction === "incoming" ? (
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
        ) : null}
      </div>
    </li>
  );
}

export default function FriendsDashboard() {
  const { overview, isLoading, error, pendingAction, sendRequest, acceptRequest, declineRequest, removeFriend } =
    useFriends();
  const [targetLogin, setTargetLogin] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage(null);

    const result = await sendRequest(targetLogin);
    if ("data" in result) {
      setTargetLogin("");
      setSuccessMessage(
        result.data.state === "created"
          ? "Zaproszenie wysłane."
          : "Taka relacja już istnieje – pokazujemy aktualne zaproszenie na liście.",
      );
    }
  }

  async function handleAccept(id: string) {
    setSuccessMessage(null);
    const result = await acceptRequest(id);
    if ("data" in result) {
      setSuccessMessage("Zaproszenie zaakceptowane.");
    }
  }

  async function handleDecline(id: string) {
    setSuccessMessage(null);
    const result = await declineRequest(id);
    if ("data" in result) {
      setSuccessMessage("Zaproszenie odrzucone.");
    }
  }

  async function handleRemove(id: string) {
    setSuccessMessage(null);
    const result = await removeFriend(id);
    if ("data" in result) {
      setSuccessMessage("Znajomy usunięty.");
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <section className="space-y-6">
        <div className="surface-panel p-6">
          <div className="flex items-center gap-2">
            <UsersRound className="text-accent h-5 w-5" />
            <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">Twoi znajomi</h2>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ładowanie znajomych...
            </p>
          ) : overview.friends.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {overview.friends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  pendingAction={pendingAction}
                  onRemove={(id) => {
                    void handleRemove(id);
                  }}
                />
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState>Nie masz jeszcze zaakceptowanych znajomych.</EmptyState>
            </div>
          )}
        </div>

        <div className="surface-panel p-6">
          <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">Zaproszenia</h2>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-wider uppercase">Przychodzące</h3>
              {overview.incomingRequests.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {overview.incomingRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      direction="incoming"
                      pendingAction={pendingAction}
                      onAccept={(id) => {
                        void handleAccept(id);
                      }}
                      onDecline={(id) => {
                        void handleDecline(id);
                      }}
                    />
                  ))}
                </ul>
              ) : (
                <div className="mt-3">
                  <EmptyState>Brak zaproszeń do zaakceptowania.</EmptyState>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-wider uppercase">Wysłane</h3>
              {overview.outgoingRequests.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {overview.outgoingRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      direction="outgoing"
                      pendingAction={pendingAction}
                      onAccept={(id) => {
                        void handleAccept(id);
                      }}
                      onDecline={(id) => {
                        void handleDecline(id);
                      }}
                    />
                  ))}
                </ul>
              ) : (
                <div className="mt-3">
                  <EmptyState>Brak oczekujących zaproszeń wysłanych przez Ciebie.</EmptyState>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside className="surface-panel h-fit p-6">
        <div className="flex items-center gap-2">
          <UserPlus className="text-primary h-5 w-5" />
          <h2 className="font-heading text-foreground text-xl font-bold tracking-tight uppercase">Dodaj znajomego</h2>
        </div>

        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <Input
            value={targetLogin}
            onChange={(event) => {
              setTargetLogin(event.target.value);
            }}
            placeholder="np. siemaema"
            aria-label="Login fana"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={pendingAction !== null || targetLogin.trim().length === 0}
            className="w-full font-semibold tracking-wider uppercase"
          >
            {pendingAction === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Wyślij zaproszenie
          </Button>
        </form>

        {successMessage ? <p className="text-accent mt-4 text-sm">{successMessage}</p> : null}
        {error ? <p className="text-destructive mt-4 text-sm">{error}</p> : null}
      </aside>
    </div>
  );
}
