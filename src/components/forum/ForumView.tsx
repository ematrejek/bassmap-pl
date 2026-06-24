import { useMemo, useState } from "react";
import { MessagesSquare, Plus, Search } from "lucide-react";
import { Equalizer } from "@/components/shell/Equalizer";
import { Button } from "@/components/ui/button";
import { readApiError } from "@/lib/api/json";
import { FORUM_SECTIONS } from "@/lib/forum/thread-schema";
import { SIGN_IN_PATH } from "@/lib/routes";
import { shellBtnOutline, shellBtnPrimary } from "@/lib/shell-styles";
import { cn } from "@/lib/utils";
import type { ForumThread, ForumThreadCategory } from "@/types";
import { ForumCreateThreadForm } from "./ForumCreateThreadForm";
import { ThreadCard } from "./ThreadCard";

const INITIAL_VISIBLE_PER_SECTION = 6;

function sectionAnchorId(category: ForumThreadCategory): string {
  return `dzial-${category.replace(/_/g, "-")}`;
}

interface Props {
  initialThreads: ForumThread[];
  replyCounts: Record<string, number>;
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function ForumView({ initialThreads, replyCounts, isLoggedIn, isAdmin }: Props) {
  const [threads, setThreads] = useState<ForumThread[]>(initialThreads);
  const [query, setQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [createCategory, setCreateCategory] = useState<ForumThreadCategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const threadsBySection = useMemo(() => {
    const map = new Map<ForumThreadCategory, ForumThread[]>();
    for (const section of FORUM_SECTIONS) {
      map.set(section.category, []);
    }
    for (const thread of threads) {
      if (normalizedQuery.length > 0 && !thread.title.toLowerCase().includes(normalizedQuery)) {
        continue;
      }
      map.get(thread.category)?.push(thread);
    }
    return map;
  }, [threads, normalizedQuery]);

  function canDeleteThread(): boolean {
    return isAdmin;
  }

  async function handleDeleteThread(threadId: string) {
    setError(null);
    setDeletingId(threadId);

    try {
      const response = await fetch(`/api/admin/forum-threads/${threadId}`, { method: "DELETE" });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się usunąć wątku");
        return;
      }
      setThreads((current) => current.filter((thread) => thread.id !== threadId));
    } catch {
      setError("Nie udało się usunąć wątku");
    } finally {
      setDeletingId(null);
    }
  }

  const signInHref = `${SIGN_IN_PATH}?redirect=${encodeURIComponent("/forum")}`;

  return (
    <div>
      <section className="border-border/70 relative overflow-hidden border-b">
        <div className="grid-backdrop absolute inset-0 opacity-50" aria-hidden />
        <div
          className="from-background/40 via-background/80 to-background absolute inset-0 bg-gradient-to-b"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="text-accent flex items-center gap-2 text-xs font-semibold tracking-[0.25em] uppercase">
            <MessagesSquare className="h-4 w-4" aria-hidden />
            Forum społeczności
            <Equalizer bars={4} className="text-accent h-3" />
          </div>

          <h1 className="font-heading text-foreground mt-5 max-w-3xl text-4xl leading-[0.95] font-black tracking-tight text-balance uppercase sm:text-5xl lg:text-6xl">
            Share the <span className="text-primary text-glow-violet">bass</span>
            <span className="text-accent text-glow-cyan">!</span>
          </h1>

          <div className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <div className="border-border bg-card/60 focus-within:border-primary/70 focus-within:shadow-glow-violet flex flex-1 items-center gap-2 rounded-lg border px-4 py-3 backdrop-blur-md">
              <Search className="text-accent h-5 w-5 shrink-0" aria-hidden />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                placeholder="Szukaj wątku po tytule…"
                aria-label="Szukaj wątku po tytule"
                className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
            {isLoggedIn ? (
              <Button
                size="lg"
                className={cn(shellBtnPrimary, "shrink-0")}
                onClick={() => {
                  setCreateCategory(FORUM_SECTIONS[0].category);
                }}
              >
                Załóż wątek
              </Button>
            ) : (
              <a
                href={signInHref}
                className={cn(
                  shellBtnPrimary,
                  "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-4 text-sm",
                )}
              >
                Zaloguj się, aby pisać
              </a>
            )}
          </div>

          <nav className="mt-10 flex flex-wrap gap-2">
            {FORUM_SECTIONS.map((section) => (
              <a
                key={section.category}
                href={`#${sectionAnchorId(section.category)}`}
                className="border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground rounded-full border px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-colors"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-16 sm:px-6 sm:py-20">
        {error ? <ServerErrorBanner message={error} /> : null}

        {FORUM_SECTIONS.map((section) => {
          const sectionThreads = threadsBySection.get(section.category) ?? [];
          const expanded = expandedSections[section.category] ?? false;
          const visibleThreads = expanded ? sectionThreads : sectionThreads.slice(0, INITIAL_VISIBLE_PER_SECTION);
          const hasMore = sectionThreads.length > INITIAL_VISIBLE_PER_SECTION;

          return (
            <section key={section.category} id={sectionAnchorId(section.category)} className="scroll-mt-24">
              <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-2">
                  <span className="text-accent flex items-center gap-2 font-mono text-xs tracking-[0.3em] uppercase">
                    <Equalizer bars={3} className="text-accent h-3" />
                    {`// ${sectionThreads.length.toString()} wątków`}
                  </span>
                  <h2 className="font-heading text-foreground text-2xl font-black tracking-tight uppercase sm:text-3xl">
                    {section.label}
                  </h2>
                  <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">{section.description}</p>
                </div>
                {isLoggedIn ? (
                  <Button
                    variant="outline"
                    className={cn(shellBtnOutline, "hover:border-primary hover:text-primary shrink-0 uppercase")}
                    onClick={() => {
                      setCreateCategory(section.category);
                    }}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Nowy wątek
                  </Button>
                ) : null}
              </header>

              {visibleThreads.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">
                  {normalizedQuery.length > 0 ? "Brak wątków pasujących do wyszukiwania." : "Brak wątków w tym dziale."}
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {visibleThreads.map((thread) => (
                    <ThreadCard
                      key={thread.id}
                      thread={thread}
                      replyCount={replyCounts[thread.id]}
                      canDelete={canDeleteThread()}
                      deleting={deletingId === thread.id}
                      onDelete={(id) => void handleDeleteThread(id)}
                    />
                  ))}
                </div>
              )}

              {hasMore && !expanded ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    className={shellBtnOutline}
                    onClick={() => {
                      setExpandedSections((current) => ({ ...current, [section.category]: true }));
                    }}
                  >
                    Pokaż więcej
                  </Button>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {createCategory !== null ? (
        <ForumCreateThreadForm
          defaultCategory={createCategory}
          onClose={() => {
            setCreateCategory(null);
          }}
          onCreated={() => {
            setCreateCategory(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ServerErrorBanner({ message }: { message: string }) {
  return (
    <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
      {message}
    </p>
  );
}
