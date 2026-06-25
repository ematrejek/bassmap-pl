import { useEventRecommendations } from "@/components/hooks/useEventRecommendations";
import { useFriends } from "@/components/hooks/useFriends";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SIGN_IN_PATH, TEAM_PATH } from "@/lib/routes";
import { Send, UsersRound } from "lucide-react";
import { useState } from "react";

interface Props {
  eventId: string;
  isLoggedIn: boolean;
  redirectPath: string;
}

export default function EventRecommendationPanel({ eventId, isLoggedIn, redirectPath }: Props) {
  const { overview, isLoading } = useFriends();
  const { isSubmitting, error, successMessage, sendRecommendation } = useEventRecommendations(eventId);
  const [recipientUserId, setRecipientUserId] = useState("");
  const [message, setMessage] = useState("");

  const signInHref = `${SIGN_IN_PATH}?redirect=${encodeURIComponent(redirectPath)}`;

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await sendRecommendation({
      recipientUserId,
      message: message.trim() || undefined,
    });

    if ("data" in result) {
      setMessage("");
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="border-border/70 rounded-xl border p-4">
        <p className="text-muted-foreground text-sm">
          <a href={signInHref} className="text-primary font-medium hover:underline">
            Zaloguj się
          </a>
          , aby polecić ten event znajomemu.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Ładowanie znajomych...</p>;
  }

  if (overview.friends.length === 0) {
    return (
      <div className="border-border/70 rounded-xl border p-4">
        <p className="text-muted-foreground text-sm">Dodaj znajomego, aby polecać mu eventy.</p>
        <Button asChild variant="outline" size="sm" className="mt-3 font-semibold tracking-wider uppercase">
          <a href={TEAM_PATH}>
            <UsersRound className="h-4 w-4" />
            Przejdź do znajomych
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
      <select
        value={recipientUserId}
        onChange={(event) => {
          setRecipientUserId(event.target.value);
        }}
        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label="Wybierz znajomego"
      >
        <option value="">Wybierz znajomego</option>
        {overview.friends.map((friend) => (
          <option key={friend.user.userId} value={friend.user.userId}>
            {friend.user.login ? `@${friend.user.login}` : "Fan bez loginu"}
          </option>
        ))}
      </select>

      <Textarea
        value={message}
        onChange={(event) => {
          setMessage(event.target.value);
        }}
        maxLength={300}
        placeholder="Opcjonalna wiadomość"
        aria-label="Opcjonalna wiadomość"
      />

      <Button
        type="submit"
        disabled={!recipientUserId || isSubmitting}
        className="w-full font-semibold tracking-wider uppercase"
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? "Wysyłanie..." : "Poleć event"}
      </Button>

      {successMessage ? <p className="text-accent text-sm">{successMessage}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </form>
  );
}
