import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createNotification, listNotifications } from "@/lib/services/notifications";

const crewJoinRequestId = "11111111-1111-1111-1111-111111111111";

describe("crew notification compatibility", () => {
  it("passes crew join request id to the notification RPC", async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: "notification-id", error: null }));
    const supabase = { rpc } as unknown as SupabaseClient;

    const result = await createNotification(supabase, {
      recipientId: "22222222-2222-2222-2222-222222222222",
      actorId: "33333333-3333-3333-3333-333333333333",
      actorLabel: "@candidate",
      type: "crew_join_request",
      body: "@candidate prosi o dołączenie do ekipy.",
      crewJoinRequestId,
    });

    expect(result).toEqual({ data: { id: "notification-id" } });
    expect(rpc).toHaveBeenCalledWith("create_notification", {
      p_recipient_id: "22222222-2222-2222-2222-222222222222",
      p_actor_id: "33333333-3333-3333-3333-333333333333",
      p_actor_label: "@candidate",
      p_type: "crew_join_request",
      p_body: "@candidate prosi o dołączenie do ekipy.",
      p_event_id: null,
      p_friend_request_id: null,
      p_crew_join_request_id: crewJoinRequestId,
    });
  });

  it("maps crew notification rows without exposing unrelated data", async () => {
    const limit = vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: "notification-id",
            recipient_id: "22222222-2222-2222-2222-222222222222",
            actor_id: "33333333-3333-3333-3333-333333333333",
            actor_label: "@owner",
            type: "crew_join_accepted",
            event_id: null,
            friend_request_id: null,
            crew_join_request_id: crewJoinRequestId,
            body: "@owner zaakceptował(a) Twoją prośbę do ekipy.",
            read_at: null,
            created_at: "2026-06-26T10:00:00.000Z",
          },
        ],
        error: null,
      }),
    );
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    const result = await listNotifications(supabase, "22222222-2222-2222-2222-222222222222");

    expect(result).toEqual({
      data: [
        {
          id: "notification-id",
          recipientId: "22222222-2222-2222-2222-222222222222",
          actorId: "33333333-3333-3333-3333-333333333333",
          actorLabel: "@owner",
          type: "crew_join_accepted",
          eventId: null,
          friendRequestId: null,
          crewJoinRequestId,
          body: "@owner zaakceptował(a) Twoją prośbę do ekipy.",
          readAt: null,
          createdAt: "2026-06-26T10:00:00.000Z",
        },
      ],
    });
  });
});
