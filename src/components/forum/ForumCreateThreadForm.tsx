import { useState, type SubmitEvent } from "react";
import { ServerError } from "@/components/auth/ServerError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readApiError } from "@/lib/api/json";
import {
  FORUM_SECTIONS,
  FORUM_THREAD_TAG_META,
  FORUM_THREAD_TAG_SLUGS,
  type ForumThreadTagSlug,
} from "@/lib/forum/thread-schema";
import { shellBtnOutline, shellBtnPrimary } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { ForumThread, ForumThreadCategory } from "@/types";

const fieldClass =
  "border-border bg-card/60 text-foreground placeholder:text-muted-foreground focus-visible:border-primary/70 focus-visible:ring-ring/30";

interface Props {
  defaultCategory: ForumThreadCategory;
  onClose: () => void;
  onCreated: (thread: ForumThread) => void;
}

export function ForumCreateThreadForm({ defaultCategory, onClose, onCreated }: Props) {
  const [category, setCategory] = useState<ForumThreadCategory>(defaultCategory);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [city, setCity] = useState("");
  const [tags, setTags] = useState<ForumThreadTagSlug[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleTag(tag: ForumThreadTagSlug) {
    setTags((current) => {
      if (current.includes(tag)) {
        return current.filter((t) => t !== tag);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, tag];
    });
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title,
          body,
          city: city.trim().length > 0 ? city : null,
          tags,
        }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się utworzyć wątku");
        return;
      }

      if (typeof data === "object" && data !== null && "thread" in data) {
        const thread = (data as { thread: ForumThread }).thread;
        onCreated(thread);
        window.location.href = `/forum/${thread.id}`;
      }
    } catch {
      setError("Nie udało się utworzyć wątku");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forum-create-title"
    >
      <div className="surface-panel max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="forum-create-title" className="font-heading text-foreground text-xl font-black uppercase">
            Nowy wątek
          </h2>
          <Button type="button" variant="outline" size="sm" className={shellBtnOutline} onClick={onClose}>
            Zamknij
          </Button>
        </div>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="forum-thread-category" className="text-foreground/90">
              Dział
            </Label>
            <select
              id="forum-thread-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as ForumThreadCategory);
              }}
              disabled={submitting}
              className={cn(
                "border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none",
                fieldClass,
              )}
            >
              {FORUM_SECTIONS.map((section) => (
                <option key={section.category} value={section.category} className="bg-card text-foreground">
                  {section.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="forum-thread-title" className="text-foreground/90">
              Tytuł
            </Label>
            <Input
              id="forum-thread-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              maxLength={120}
              disabled={submitting}
              className={fieldClass}
              placeholder="Krótki, konkretny tytuł"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="forum-thread-body" className="text-foreground/90">
              Treść
            </Label>
            <Textarea
              id="forum-thread-body"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
              }}
              rows={6}
              maxLength={2000}
              disabled={submitting}
              className={fieldClass}
              placeholder="Opisz, o co chodzi w wątku…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="forum-thread-city" className="text-foreground/90">
              Miasto <span className="text-muted-foreground text-xs">(opcjonalnie)</span>
            </Label>
            <Input
              id="forum-thread-city"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
              }}
              maxLength={80}
              disabled={submitting}
              className={fieldClass}
              placeholder="np. Wrocław"
            />
          </div>

          <div className="space-y-2">
            <span className="text-foreground/90 text-sm font-medium">
              Tagi <span className="text-muted-foreground text-xs">(opcjonalnie, maks. 3)</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {FORUM_THREAD_TAG_SLUGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      toggleTag(tag);
                    }}
                    disabled={submitting}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-bold tracking-widest uppercase transition-colors",
                      active
                        ? "border-primary/60 bg-primary/20 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {FORUM_THREAD_TAG_META[tag].label}
                  </button>
                );
              })}
            </div>
          </div>

          {error ? <ServerError message={error} /> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className={shellBtnOutline} onClick={onClose} disabled={submitting}>
              Anuluj
            </Button>
            <Button
              type="submit"
              className={shellBtnPrimary}
              disabled={submitting || title.trim().length === 0 || body.trim().length === 0}
            >
              {submitting ? "Tworzenie…" : "Załóż wątek"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
