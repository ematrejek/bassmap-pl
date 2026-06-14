import { z } from "zod";
import { isValidCoverPath } from "@/lib/storage/event-covers";
import { SUBGENRES, type CoverAspect, type EventCurrency, type EventPriceMode, type Subgenre } from "@/types";

const subgenreSchema = z.enum(SUBGENRES as [Subgenre, ...Subgenre[]]);
const priceModeSchema = z.enum(["exact", "from", "range"] satisfies [EventPriceMode, EventPriceMode, EventPriceMode]);
const currencySchema = z.enum(["PLN", "EUR", "CZK"] satisfies [EventCurrency, EventCurrency, EventCurrency]);

const priceAmountSchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    return Number(trimmed);
  }
  return value;
}, z.number().positive("Podaj kwotę większą od zera").nullable().optional());

interface PriceValidatable {
  isFree?: boolean;
  priceMode?: EventPriceMode | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: EventCurrency | null;
}

function hasDefinedPriceField(data: PriceValidatable): boolean {
  return (
    data.priceMode !== undefined ||
    data.priceMin !== undefined ||
    data.priceMax !== undefined ||
    data.currency !== undefined
  );
}

function hasAnyPriceValue(data: PriceValidatable): boolean {
  return data.priceMode != null || data.priceMin != null || data.priceMax != null || data.currency != null;
}

function validateStructuredPrice(data: PriceValidatable, ctx: z.RefinementCtx): void {
  const isFree = data.isFree ?? false;

  if (isFree) {
    if (hasAnyPriceValue(data)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wydarzenie darmowe nie może mieć ustawionej ceny",
      });
    }
    return;
  }

  if (!hasAnyPriceValue(data)) {
    return;
  }

  if (data.priceMode == null || data.priceMin == null || data.currency == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Podaj komplet danych ceny: tryb, kwotę i walutę",
    });
    return;
  }

  if (data.priceMode === "range") {
    if (data.priceMax == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "W przedziale podaj kwotę maksymalną",
      });
      return;
    }
    if (data.priceMax <= data.priceMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "W przedziale cena maksymalna musi być większa od minimalnej",
      });
    }
    return;
  }

  if (data.priceMax != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Kwota maksymalna jest dozwolona tylko w trybie przedziału",
    });
  }
}

function validateStructuredPriceOnUpdate(data: PriceValidatable, ctx: z.RefinementCtx): void {
  if (data.isFree === true) {
    validateStructuredPrice(data, ctx);
    return;
  }

  if (!hasDefinedPriceField(data)) {
    return;
  }

  validateStructuredPrice(data, ctx);
}

const startsAtSchema = z
  .string()
  .min(1, "Data rozpoczęcia jest wymagana")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Nieprawidłowy format daty",
  });

const ticketUrlSchema = z
  .string()
  .url("Nieprawidłowy adres URL biletów")
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "Adres biletów musi zaczynać się od http:// lub https://",
  })
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

const latitudeSchema = z
  .number({ required_error: "Szerokość geograficzna jest wymagana" })
  .min(-90, "Szerokość geograficzna musi być między -90 a 90")
  .max(90, "Szerokość geograficzna musi być między -90 a 90");

const longitudeSchema = z
  .number({ required_error: "Długość geograficzna jest wymagana" })
  .min(-180, "Długość geograficzna musi być między -180 a 180")
  .max(180, "Długość geograficzna musi być między -180 a 180");

const coverPathSchema = z
  .string()
  .refine(isValidCoverPath, { message: "Nieprawidłowa ścieżka okładki" })
  .nullable()
  .optional();

const coverAspectSchema = z
  .enum(["portrait", "landscape"] satisfies [CoverAspect, CoverAspect])
  .nullable()
  .optional();

const descriptionSchema = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || value === "") {
      return null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return value;
  },
  z.union([z.string().max(5000, "Opis może mieć maksymalnie 5000 znaków"), z.null()]).optional(),
);

const commonEventFields = {
  name: z.string().min(1, "Nazwa wydarzenia jest wymagana"),
  startsAt: startsAtSchema,
  city: z.string().min(1, "Miasto jest wymagane"),
  venueName: z.string().min(1, "Podaj miejsce lub opis lokalizacji (np. „pod mostem Łazienkowskim”)"),
  subgenres: z.array(subgenreSchema).min(1, "Wybierz co najmniej jeden podgatunek"),
  lineup: z.array(z.string()).optional().nullable(),
  description: descriptionSchema,
  ticketUrl: ticketUrlSchema,
  isFree: z.boolean().optional().default(false),
  priceMode: priceModeSchema.optional().nullable(),
  priceMin: priceAmountSchema,
  priceMax: priceAmountSchema,
  currency: currencySchema.optional().nullable(),
};

const eventCreateAddressSchema = z.object({
  locationMode: z.literal("address"),
  addressStreet: z.string().min(1, "Ulica jest wymagana"),
  addressNumber: z.string().min(1, "Numer budynku jest wymagany"),
  ...commonEventFields,
});

const eventCreateCoordinatesSchema = z.object({
  locationMode: z.literal("coordinates"),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  addressStreet: z.string().optional().nullable(),
  addressNumber: z.string().optional().nullable(),
  ...commonEventFields,
});

const eventCreateDiscriminatedSchema = z
  .discriminatedUnion("locationMode", [eventCreateAddressSchema, eventCreateCoordinatesSchema])
  .superRefine(validateStructuredPrice);

const eventCreateInputSchema = z.preprocess((value) => {
  if (typeof value === "object" && value !== null && !("locationMode" in value)) {
    return { ...value, locationMode: "address" };
  }
  return value;
}, eventCreateDiscriminatedSchema);

export type ParsedEventCreate = z.infer<typeof eventCreateDiscriminatedSchema>;

const eventUpdatePartialSchema = z
  .object({
    name: z.string().min(1, "Nazwa wydarzenia jest wymagana").optional(),
    startsAt: startsAtSchema.optional(),
    city: z.string().min(1, "Miasto jest wymagane").optional(),
    venueName: z.string().min(1, "Podaj miejsce lub opis lokalizacji (np. „pod mostem Łazienkowskim”)").optional(),
    subgenres: z.array(subgenreSchema).min(1, "Wybierz co najmniej jeden podgatunek").optional(),
    lineup: z.array(z.string()).optional().nullable(),
    description: descriptionSchema,
    ticketUrl: ticketUrlSchema,
    isFree: z.boolean().optional(),
    priceMode: priceModeSchema.optional().nullable(),
    priceMin: priceAmountSchema,
    priceMax: priceAmountSchema,
    currency: currencySchema.optional().nullable(),
    locationMode: z.enum(["address", "coordinates"]).optional(),
    addressStreet: z.string().min(1, "Ulica jest wymagana").optional().nullable(),
    addressNumber: z.string().min(1, "Numer budynku jest wymagany").optional().nullable(),
    latitude: latitudeSchema.optional(),
    longitude: longitudeSchema.optional(),
    coverPath: coverPathSchema,
    coverAspect: coverAspectSchema,
  })
  .superRefine((data, ctx) => {
    if (data.locationMode === "coordinates") {
      if (data.latitude === undefined || data.longitude === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Szerokość i długość geograficzna są wymagane w trybie współrzędnych",
        });
      }
    }

    if (data.locationMode === "address") {
      const hasPartialAddress = data.addressStreet !== undefined || data.addressNumber !== undefined;
      if (hasPartialAddress) {
        if (!data.addressStreet) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["addressStreet"],
            message: "Ulica jest wymagana",
          });
        }
        if (!data.addressNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["addressNumber"],
            message: "Numer budynku jest wymagany",
          });
        }
      }
    }

    if (data.latitude !== undefined && data.longitude === undefined && data.locationMode !== "address") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Podaj obie współrzędne",
      });
    }

    if (data.longitude !== undefined && data.latitude === undefined && data.locationMode !== "address") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Podaj obie współrzędne",
      });
    }

    validateStructuredPriceOnUpdate(data, ctx);
  });

export type ParsedEventUpdate = z.infer<typeof eventUpdatePartialSchema>;

export function parseEventCreate(
  input: unknown,
): { success: true; data: ParsedEventCreate } | { success: false; error: string } {
  const result = eventCreateInputSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: formatZodError(result.error) };
  }
  return { success: true, data: result.data };
}

export function parseEventUpdate(
  input: unknown,
): { success: true; data: ParsedEventUpdate } | { success: false; error: string } {
  const result = eventUpdatePartialSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: formatZodError(result.error) };
  }
  return { success: true, data: result.data };
}

function formatZodError(error: z.ZodError): string {
  if (error.issues.length === 0) {
    return "Nieprawidłowe dane wejściowe";
  }
  return error.issues[0].message;
}

// Exported for tests / reuse
export {
  coverAspectSchema,
  coverPathSchema,
  eventCreateAddressSchema,
  eventCreateCoordinatesSchema,
  eventUpdatePartialSchema,
};
