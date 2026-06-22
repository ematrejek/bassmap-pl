import { useState, type SubmitEvent } from "react";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readApiError } from "@/lib/api/json";
import { formatEventDate } from "@/lib/events/format";
import { SIGN_IN_PATH } from "@/lib/routes";
import { shellBtnOutline, shellBtnPrimary, shellLink, shellTextMuted } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { EventComment } from "@/types";

const fieldClass =
  "border-border bg-card/60 text-foreground placeholder:text-muted-foreground focus-visible:border-primary/70 focus-visible:ring-ring/30";

interface Props {
  eventId: string;
  initialComments: EventComment[];
  isLoggedIn: boolean;
  isAdmin: boolean;
  currentUserId: string | null;
  redirectPath: string;
}

export default function EventCommentsSection({
  eventId,
  initialComments,
  isLoggedIn,
  isAdmin,
  currentUserId,
  redirectPath,
}: Props) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const signInHref = `${SIGN_IN_PATH}?redirect=${encodeURIComponent(redirectPath)}`;
  const pendingDeleteComment = comments.find((comment) => comment.id === pendingDeleteId);

  function canDeleteComment(comment: EventComment): boolean {
    if (isAdmin) {
      return true;
    }
    return currentUserId !== null && comment.authorId === currentUserId;
  }

  function deleteCommentUrl(commentId: string): string {
    return isAdmin ? `/api/admin/event-comments/${commentId}` : `/api/fan/event-comments/${commentId}`;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/events/${eventId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się dodać komentarza");
        return;
      }

      if (typeof data === "object" && data !== null && "comment" in data) {
        const comment = (data as { comment: EventComment }).comment;
        setComments((current) => [...current, comment]);
        setBody("");
      }
    } catch {
      setError("Nie udało się dodać komentarza");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDeleteId) {
      return;
    }

    const commentId = pendingDeleteId;
    const deleteUrl = deleteCommentUrl(commentId);
    setError(null);
    setDeletingId(commentId);
    setPendingDeleteId(null);

    try {
      const response = await fetch(deleteUrl, {
        method: "DELETE",
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się usunąć komentarza");
        return;
      }

      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch {
      setError("Nie udało się usunąć komentarza");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="border-border space-y-4 border-t pt-6">
      <h2 className="text-accent text-sm font-semibold tracking-wide uppercase">Komentarze</h2>

      {comments.length === 0 ? (
        <p className={cn("text-sm", shellTextMuted)}>Brak komentarzy.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="border-border/60 space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-foreground text-sm font-medium">{comment.authorLabel}</p>
                <div className="flex items-center gap-2">
                  <time className={cn("text-xs", shellTextMuted)} dateTime={comment.createdAt}>
                    {formatEventDate(comment.createdAt)}
                  </time>
                  {canDeleteComment(comment) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(shellBtnOutline, "h-7 px-2 text-xs")}
                      disabled={deletingId === comment.id}
                      onClick={() => {
                        setPendingDeleteId(comment.id);
                      }}
                    >
                      {deletingId === comment.id ? "Usuwanie…" : "Usuń"}
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className={cn("text-sm whitespace-pre-wrap", shellTextMuted)}>{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      {error ? <ServerError message={error} /> : null}

      {isLoggedIn ? (
        <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="event-comment-body" className="text-foreground/90">
              Twój komentarz
            </Label>
            <Textarea
              id="event-comment-body"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
              }}
              rows={4}
              maxLength={2000}
              disabled={submitting}
              className={fieldClass}
              placeholder="Napisz komentarz…"
            />
          </div>
          <Button type="submit" className={shellBtnPrimary} disabled={submitting || body.trim().length === 0}>
            {submitting ? "Wysyłanie…" : "Wyślij"}
          </Button>
        </form>
      ) : (
        <p className={cn("text-sm", shellTextMuted)}>
          <a href={signInHref} className={cn(shellLink, "font-medium hover:underline")}>
            Zaloguj się
          </a>
          , aby skomentować.
        </p>
      )}

      {pendingDeleteId !== null ? (
        <div
          className="border-destructive/40 bg-destructive/5 space-y-3 rounded-lg border p-4"
          role="alertdialog"
          aria-labelledby="delete-comment-title"
          aria-describedby="delete-comment-description"
        >
          <div className="space-y-2">
            <p id="delete-comment-title" className="text-foreground font-medium">
              Usunąć komentarz?
            </p>
            <p id="delete-comment-description" className={cn("text-sm", shellTextMuted)}>
              Ta operacja jest trwała. Komentarz zniknie ze strony wydarzenia.
            </p>
            {pendingDeleteComment ? (
              <p className={cn("text-sm whitespace-pre-wrap", shellTextMuted)}>{pendingDeleteComment.body}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className={shellBtnOutline}
              onClick={() => {
                setPendingDeleteId(null);
              }}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              className={shellBtnPrimary}
              disabled={deletingId === pendingDeleteId}
              onClick={() => {
                void handleDeleteConfirm();
              }}
            >
              {deletingId === pendingDeleteId ? "Usuwanie…" : "Usuń"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
