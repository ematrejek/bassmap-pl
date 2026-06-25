import { useNotifications } from "@/components/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TEAM_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";
import { Bell, Check, Loader2 } from "lucide-react";
import type { MouseEvent } from "react";

function formatNotificationTime(value: string): string {
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function notificationHref(notification: Notification): string | null {
  if (notification.type === "event_recommendation" && notification.eventId) {
    return `/events/${notification.eventId}`;
  }
  if (notification.type === "friend_request" || notification.type === "friend_request_accepted") {
    return TEAM_PATH;
  }

  return null;
}

function NotificationItem({
  notification,
  pendingReadId,
  onOpen,
}: {
  notification: Notification;
  pendingReadId: string | null;
  onOpen: (notification: Notification, href: string | null) => Promise<void>;
}) {
  const href = notificationHref(notification);
  const isUnread = notification.readAt === null;
  const isPending = pendingReadId === notification.id;

  async function handleClick(event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
    event.preventDefault();
    await onOpen(notification, href);
  }

  const content = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="text-foreground text-sm leading-5">{notification.body}</span>
        {isUnread ? (
          <span className="bg-primary mt-1 h-2 w-2 shrink-0 rounded-full" aria-label="Nieprzeczytane" />
        ) : null}
      </span>
      <span className="text-muted-foreground mt-2 flex items-center justify-between gap-2 text-xs">
        <span>{formatNotificationTime(notification.createdAt)}</span>
        {isPending ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Otwieranie
          </span>
        ) : null}
      </span>
    </>
  );

  const className = cn(
    "border-border bg-background/50 block w-full rounded-lg border p-3 text-left transition-colors",
    "hover:border-primary/50 hover:bg-secondary/70 focus-visible:ring-ring/30 focus-visible:ring-2 focus-visible:outline-none",
    isUnread && "border-primary/40 bg-primary/5",
  );

  if (href) {
    return (
      <a href={href} onClick={handleClick} className={className}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {content}
    </button>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, isLoading, error, pendingReadId, refresh, markRead } = useNotifications();

  async function handleOpenNotification(notification: Notification, href: string | null) {
    if (notification.readAt === null) {
      await markRead(notification.id);
    }

    if (href) {
      window.location.assign(href);
    }
  }

  return (
    <Popover
      onOpenChange={(isOpen) => {
        if (isOpen) {
          void refresh();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={unreadCount > 0 ? `Powiadomienia: ${unreadCount} nieprzeczytanych` : "Powiadomienia"}
          className={cn(
            "font-heading border-border bg-card/60 text-foreground shadow-glow-violet relative h-10 rounded-md px-3 uppercase backdrop-blur-md",
            "hover:border-primary/50 hover:bg-secondary hover:text-accent",
          )}
        >
          <Bell className="text-accent size-4" aria-hidden />
          {unreadCount > 0 ? (
            <Badge className="bg-primary text-primary-foreground absolute -top-2 -right-2 min-w-5 px-1.5 py-0 text-[0.65rem]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="border-primary/30 bg-card/95 w-80 p-0 backdrop-blur-xl">
        <div className="border-border flex items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="font-heading text-foreground text-sm font-bold tracking-wider uppercase">Powiadomienia</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {unreadCount > 0 ? `${unreadCount} nieprzeczytanych` : "Brak nowych powiadomień"}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span className="sr-only">Odśwież powiadomienia</span>
          </Button>
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto p-3">
          {isLoading ? (
            <p className="text-muted-foreground flex items-center gap-2 p-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ładowanie powiadomień...
            </p>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                pendingReadId={pendingReadId}
                onOpen={handleOpenNotification}
              />
            ))
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
              Nie masz jeszcze powiadomień.
            </p>
          )}
        </div>

        {error ? <p className="text-destructive border-border border-t p-3 text-sm">{error}</p> : null}
      </PopoverContent>
    </Popover>
  );
}
