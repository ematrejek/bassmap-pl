import { useFriendRelationship } from "@/components/hooks/useFriendRelationship";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH, TEAM_PATH } from "@/lib/routes";
import { Check, Loader2, UserPlus, UsersRound, X } from "lucide-react";
import { useState } from "react";

interface Props {
  profileUserId: string;
  profileLogin: string;
  isLoggedIn: boolean;
}

export default function FriendActionButton({ profileUserId, profileLogin, isLoggedIn }: Props) {
  const { relationship, isLoading, error, pendingAction, sendRequest, acceptRequest, declineRequest } =
    useFriendRelationship(profileUserId);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  async function handleAccept() {
    if (!relationship.requestId) {
      return;
    }

    setSuccessMessage(null);
    const result = await acceptRequest(relationship.requestId);
    if ("data" in result) {
      setSuccessMessage("Zaproszenie zaakceptowane.");
    }
  }

  async function handleDecline() {
    if (!relationship.requestId) {
      return;
    }

    setSuccessMessage(null);
    const result = await declineRequest(relationship.requestId);
    if ("data" in result) {
      setSuccessMessage("Zaproszenie odrzucone.");
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

  if (relationship.state === "self") {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {relationship.state === "friends" ? (
        <Button asChild variant="outline" className="w-full font-semibold tracking-wider uppercase">
          <a href={TEAM_PATH}>
            <UsersRound className="h-4 w-4" />
            Jesteście znajomymi
          </a>
        </Button>
      ) : relationship.state === "incoming_pending" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={() => void handleAccept()}
            disabled={pendingAction !== null}
            className="font-semibold tracking-wider uppercase"
          >
            <Check className="h-4 w-4" />
            Akceptuj
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDecline()}
            disabled={pendingAction !== null}
            className="font-semibold tracking-wider uppercase"
          >
            <X className="h-4 w-4" />
            Odrzuć
          </Button>
        </div>
      ) : relationship.state === "outgoing_pending" ? (
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
