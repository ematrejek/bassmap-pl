import { useFriends } from "@/components/hooks/useFriends";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH, TEAM_PATH } from "@/lib/routes";
import type { FriendRequestSummary } from "@/lib/services/friends";
import { Check, Loader2, UserPlus, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";

interface Props {
  profileUserId: string;
  profileLogin: string;
  isLoggedIn: boolean;
}

export default function FriendActionButton({ profileUserId, profileLogin, isLoggedIn }: Props) {
  const { overview, isLoading, error, pendingAction, sendRequest, acceptRequest, declineRequest } = useFriends();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const friendship = useMemo(
    () => overview.friends.find((friend) => friend.user.userId === profileUserId) ?? null,
    [overview.friends, profileUserId],
  );

  const incomingRequest = useMemo(
    () => overview.incomingRequests.find((request) => request.requester.userId === profileUserId) ?? null,
    [overview.incomingRequests, profileUserId],
  );

  const outgoingRequest = useMemo(
    () => overview.outgoingRequests.find((request) => request.addressee.userId === profileUserId) ?? null,
    [overview.outgoingRequests, profileUserId],
  );

  async function handleSend() {
    setSuccessMessage(null);
    const result = await sendRequest(profileLogin);
    if ("data" in result) {
      setSuccessMessage(
        result.data.state === "incoming_pending"
          ? "Ten fan już wysłał Ci zaproszenie. Możesz je zaakceptować poniżej."
          : "Zaproszenie wysłane.",
      );
    }
  }

  async function handleUpdate(request: FriendRequestSummary, status: "accepted" | "declined") {
    setSuccessMessage(null);
    const result = status === "accepted" ? await acceptRequest(request.id) : await declineRequest(request.id);
    if ("data" in result) {
      setSuccessMessage(status === "accepted" ? "Zaproszenie zaakceptowane." : "Zaproszenie odrzucone.");
    }
  }

  if (!isLoggedIn) {
    return (
      <Button asChild variant="outline" className="w-full font-semibold tracking-wider uppercase">
        <a href={SIGN_IN_PATH}>Zaloguj się, aby zaprosić</a>
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Button type="button" variant="outline" disabled className="w-full font-semibold tracking-wider uppercase">
        <Loader2 className="h-4 w-4 animate-spin" />
        Sprawdzam relację
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {friendship ? (
        <Button asChild variant="outline" className="w-full font-semibold tracking-wider uppercase">
          <a href={TEAM_PATH}>
            <UsersRound className="h-4 w-4" />
            Jesteście znajomymi
          </a>
        </Button>
      ) : incomingRequest ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={() => void handleUpdate(incomingRequest, "accepted")}
            disabled={pendingAction !== null}
            className="font-semibold tracking-wider uppercase"
          >
            <Check className="h-4 w-4" />
            Akceptuj
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleUpdate(incomingRequest, "declined")}
            disabled={pendingAction !== null}
            className="font-semibold tracking-wider uppercase"
          >
            <X className="h-4 w-4" />
            Odrzuć
          </Button>
        </div>
      ) : outgoingRequest ? (
        <Button type="button" variant="outline" disabled className="w-full font-semibold tracking-wider uppercase">
          <Loader2 className="h-4 w-4" />
          Zaproszenie oczekuje
        </Button>
      ) : (
        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={pendingAction !== null}
          className="w-full font-semibold tracking-wider uppercase"
        >
          <UserPlus className="h-4 w-4" />
          Dodaj do znajomych
        </Button>
      )}

      {successMessage ? <p className="text-accent text-xs">{successMessage}</p> : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
