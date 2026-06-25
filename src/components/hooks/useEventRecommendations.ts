import { readApiError } from "@/lib/api/json";
import type { EventRecommendation } from "@/types";
import { useState } from "react";

export function useEventRecommendations(eventId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function sendRecommendation(input: {
    recipientUserId: string;
    message?: string;
  }): Promise<{ data: EventRecommendation } | { error: string }> {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/events/${eventId}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message = readApiError(data) ?? "Nie udało się wysłać polecenia";
        setError(message);
        return { error: message };
      }

      setSuccessMessage("Polecenie wysłane.");
      return { data: (data as { recommendation: EventRecommendation }).recommendation };
    } catch {
      setError("Nie udało się wysłać polecenia");
      return { error: "Nie udało się wysłać polecenia" };
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    isSubmitting,
    error,
    successMessage,
    sendRecommendation,
  };
}
