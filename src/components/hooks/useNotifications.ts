import { readApiError } from "@/lib/api/json";
import type { Notification } from "@/types";
import { useCallback, useEffect, useState } from "react";

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingReadId, setPendingReadId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/fan/notifications", {
        credentials: "include",
      });
      const data = await parseJson(response);

      if (!response.ok) {
        setError(readApiError(data) ?? "Nie udało się załadować powiadomień");
        return;
      }

      const payload = data as NotificationsResponse;
      setNotifications(payload.notifications);
      setUnreadCount(payload.unreadCount);
    } catch {
      setError("Nie udało się załadować powiadomień");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialNotifications() {
      try {
        const response = await fetch("/api/fan/notifications", {
          credentials: "include",
        });
        const data = await parseJson(response);

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setError(readApiError(data) ?? "Nie udało się załadować powiadomień");
          return;
        }

        const payload = data as NotificationsResponse;
        setNotifications(payload.notifications);
        setUnreadCount(payload.unreadCount);
      } catch {
        if (isMounted) {
          setError("Nie udało się załadować powiadomień");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const markRead = useCallback(
    async (notificationId: string): Promise<{ ok: true } | { error: string }> => {
      setPendingReadId(notificationId);
      setError(null);

      try {
        const response = await fetch(`/api/fan/notifications/${notificationId}/read`, {
          method: "PATCH",
          credentials: "include",
        });
        const data = await parseJson(response);

        if (!response.ok) {
          const message = readApiError(data) ?? "Nie udało się oznaczyć powiadomienia jako przeczytane";
          setError(message);
          return { error: message };
        }

        await loadNotifications();
        return { ok: true };
      } catch {
        const message = "Nie udało się oznaczyć powiadomienia jako przeczytane";
        setError(message);
        return { error: message };
      } finally {
        setPendingReadId(null);
      }
    },
    [loadNotifications],
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    pendingReadId,
    refresh: loadNotifications,
    markRead,
  };
}
