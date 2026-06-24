import { MapPin, MessageSquare } from "lucide-react";
import GenreBadge from "@/components/fan/GenreBadge";
import { Button } from "@/components/ui/button";
import { forumExcerpt, formatForumDate } from "@/lib/forum/format";
import { FORUM_THREAD_TAG_META, type ForumThreadTagSlug } from "@/lib/forum/thread-schema";
import { cn } from "@/lib/utils";
import type { ForumThread } from "@/types";

function isKnownTag(tag: string): tag is ForumThreadTagSlug {
  return tag in FORUM_THREAD_TAG_META;
}

interface Props {
  thread: ForumThread;
  replyCount?: number;
  canDelete: boolean;
  deleting: boolean;
  onDelete: (threadId: string) => void;
}

export function ThreadCard({ thread, replyCount, canDelete, deleting, onDelete }: Props) {
  const href = `/forum/${thread.id}`;
  const knownTags = thread.tags.filter(isKnownTag);

  return (
    <article className="group border-border bg-card/50 hover:border-primary/50 hover:shadow-glow-violet relative flex flex-col gap-3 rounded-xl border p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1">
      {knownTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {knownTags.map((tag) => (
            <GenreBadge key={tag} color={FORUM_THREAD_TAG_META[tag].color}>
              {FORUM_THREAD_TAG_META[tag].label}
            </GenreBadge>
          ))}
        </div>
      ) : null}

      <a href={href} className="focus-visible:ring-ring/50 rounded-sm focus-visible:ring-2 focus-visible:outline-none">
        <h3 className="font-heading text-foreground group-hover:text-glow-violet text-lg leading-tight font-bold tracking-tight uppercase transition-colors">
          {thread.title}
        </h3>
      </a>

      <p className="text-muted-foreground text-sm leading-relaxed">{forumExcerpt(thread.body)}</p>

      <div className="border-border/70 text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs">
        <span className="text-accent font-mono">@{thread.authorLabel}</span>
        {thread.city ? (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {thread.city}
          </span>
        ) : null}
        {typeof replyCount === "number" ? (
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            <span className="text-foreground font-semibold">{replyCount}</span>
          </span>
        ) : null}
        <time className="ml-auto font-mono" dateTime={thread.updatedAt}>
          {formatForumDate(thread.updatedAt)}
        </time>
      </div>

      {canDelete ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("border-destructive/40 text-destructive hover:bg-destructive/10 h-7 px-2 text-xs")}
            disabled={deleting}
            onClick={() => {
              onDelete(thread.id);
            }}
          >
            {deleting ? "Usuwanie…" : "Usuń wątek"}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
