import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
};

export const createEventRecommendationSchema = z.object({
  recipientUserId: z.string().uuid("Nieprawidłowy identyfikator odbiorcy"),
  message: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(300, "Wiadomość może mieć maksymalnie 300 znaków").optional(),
  ),
});

export type CreateEventRecommendationInput = z.infer<typeof createEventRecommendationSchema>;
