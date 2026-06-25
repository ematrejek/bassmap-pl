import { z } from "zod";
import type { ForumThreadCategory } from "@/types";

export type ForumNeonColor = "violet" | "cyan" | "green" | "orange";

export const FORUM_THREAD_CATEGORIES = [
  "szukam_ekipy",
  "jestesmy_ekipa",
  "podziel_sie_muzyka",
  "sprzet_produkcja",
  "transport_noclegi",
  "pozostale",
] as const satisfies readonly ForumThreadCategory[];

export const forumThreadCategorySchema = z.enum(FORUM_THREAD_CATEGORIES, {
  errorMap: () => ({ message: "Wybierz dział forum" }),
});

export interface ForumSectionMeta {
  category: ForumThreadCategory;
  label: string;
  color: ForumNeonColor;
}

export const FORUM_SECTIONS: ForumSectionMeta[] = [
  {
    category: "szukam_ekipy",
    label: "Szukam ekipy",
    color: "violet",
  },
  {
    category: "jestesmy_ekipa",
    label: "Dołącz do nas",
    color: "green",
  },
  {
    category: "podziel_sie_muzyka",
    label: "Podziel się muzyką",
    color: "cyan",
  },
  {
    category: "sprzet_produkcja",
    label: "Sprzęt i produkcja",
    color: "orange",
  },
  {
    category: "transport_noclegi",
    label: "Transport i noclegi",
    color: "violet",
  },
  {
    category: "pozostale",
    label: "Pozostałe wątki",
    color: "cyan",
  },
];

const forumThreadTitleSchema = z
  .string()
  .trim()
  .min(1, "Tytuł nie może być pusty")
  .max(120, "Tytuł może mieć maksymalnie 120 znaków");

const forumThreadBodySchema = z
  .string()
  .trim()
  .min(1, "Treść nie może być pusta")
  .max(2000, "Treść może mieć maksymalnie 2000 znaków");

const forumThreadCitySchema = z
  .string()
  .trim()
  .max(80, "Miasto może mieć maksymalnie 80 znaków")
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const createForumThreadSchema = z.object({
  category: forumThreadCategorySchema,
  title: forumThreadTitleSchema,
  body: forumThreadBodySchema,
  city: forumThreadCitySchema,
});

export type CreateForumThreadInput = z.infer<typeof createForumThreadSchema>;

export function parseCreateForumThreadInput(
  input: unknown,
): { success: true; data: CreateForumThreadInput } | { success: false; error: string } {
  const result = createForumThreadSchema.safeParse(input);
  if (!result.success) {
    const firstIssue = result.error.issues[0]?.message ?? "Nieprawidłowe dane wątku";
    return { success: false, error: firstIssue };
  }

  return { success: true, data: result.data };
}

export function getForumSectionMeta(category: ForumThreadCategory): ForumSectionMeta | undefined {
  return FORUM_SECTIONS.find((section) => section.category === category);
}
