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

export const FORUM_THREAD_TAG_SLUGS = ["dnb", "jungle", "dubstep", "rave", "hardcore"] as const;

export type ForumThreadTagSlug = (typeof FORUM_THREAD_TAG_SLUGS)[number];

export const FORUM_THREAD_TAG_META: Record<
  ForumThreadTagSlug,
  { label: string; color: ForumNeonColor }
> = {
  dnb: { label: "DNB", color: "violet" },
  jungle: { label: "JUNGLE", color: "green" },
  dubstep: { label: "DUBSTEP", color: "cyan" },
  rave: { label: "RAVE", color: "orange" },
  hardcore: { label: "HARDCORE", color: "violet" },
};

export interface ForumSectionMeta {
  category: ForumThreadCategory;
  label: string;
  description: string;
  color: ForumNeonColor;
}

export const FORUM_SECTIONS: ForumSectionMeta[] = [
  {
    category: "szukam_ekipy",
    label: "Szukam ekipy",
    description:
      "Jeździsz solo i chcesz dołączyć do crew? Zostaw ogłoszenie – bassheadzi z całej Polski czytają.",
    color: "violet",
  },
  {
    category: "jestesmy_ekipa",
    label: "Jesteśmy ekipą, szukamy ziomków",
    description:
      "Macie crew i potrzebujecie świeżej krwi – DJ-ów, promotorów, ekipy technicznej? Tu się rekrutuje.",
    color: "green",
  },
  {
    category: "podziel_sie_muzyka",
    label: "Podziel się muzyką",
    description:
      "Wrzuć swój set, premierę, edit albo zapomnianą perełkę. Linki do SoundCloud, Bandcamp i mixów mile widziane.",
    color: "cyan",
  },
  {
    category: "sprzet_produkcja",
    label: "Sprzęt i produkcja",
    description:
      "Gadanie o kontrolerach, monitorach, soundsystemach i pluginach. Pomoc przy miksie i masteringu.",
    color: "orange",
  },
  {
    category: "transport_noclegi",
    label: "Transport i noclegi",
    description:
      "Łączcie się na wspólne dojazdy na rave'y, dzielcie kosztami paliwa i ogarniajcie kimę po imprezie.",
    color: "violet",
  },
  {
    category: "pozostale",
    label: "Pozostałe wątki",
    description:
      "Wszystko, co nie pasuje gdzie indziej – giełda, opinie o klubach, off-topic i gadki o scenie.",
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

const forumThreadTagsSchema = z
  .array(z.enum(FORUM_THREAD_TAG_SLUGS))
  .max(3, "Możesz dodać maksymalnie 3 tagi")
  .optional()
  .default([]);

export const createForumThreadSchema = z.object({
  category: forumThreadCategorySchema,
  title: forumThreadTitleSchema,
  body: forumThreadBodySchema,
  city: forumThreadCitySchema,
  tags: forumThreadTagsSchema,
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
