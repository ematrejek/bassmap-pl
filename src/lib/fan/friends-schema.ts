import { z } from "zod";
import { fanLoginSchema } from "@/lib/fan/profile-schema";

export const sendFriendRequestSchema = z.object({
  targetLogin: fanLoginSchema,
});

export const updateFriendRequestStatusSchema = z.object({
  status: z.enum(["accepted", "declined"], {
    message: "Status zaproszenia musi mieć wartość accepted albo declined",
  }),
});

export const friendRelationshipIdSchema = z.string().uuid("Nieprawidłowy identyfikator relacji znajomych");

export const friendRelationshipStatusQuerySchema = z.object({
  userId: z.string().uuid("Nieprawidłowy identyfikator użytkownika"),
});

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type UpdateFriendRequestStatusInput = z.infer<typeof updateFriendRequestStatusSchema>;
