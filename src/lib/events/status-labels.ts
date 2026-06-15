import type { EventStatus } from "@/types";

export const STATUS_LABELS: Record<EventStatus, string> = {
  published: "Opublikowane",
  draft: "Szkic",
  pending: "Oczekuje",
  rejected: "Odrzucone",
};

export function statusBadgeClass(status: EventStatus): string {
  switch (status) {
    case "published":
      return "border-neon-green/40 bg-neon-green/15 text-foreground";
    case "draft":
      return "border-border bg-secondary text-muted-foreground";
    case "pending":
      return "border-neon-orange/40 bg-neon-orange/15 text-foreground";
    case "rejected":
      return "border-destructive/40 bg-destructive/15 text-foreground";
  }
}
