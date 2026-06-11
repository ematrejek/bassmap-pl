import { z } from "zod";
import { SUBGENRES, type Subgenre } from "@/types";

const subgenreSchema = z.enum(SUBGENRES as [Subgenre, ...Subgenre[]]);

const startsAtSchema = z
  .string()
  .min(1, "Data rozpoczęcia jest wymagana")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Nieprawidłowy format daty",
  });

const ticketUrlSchema = z
  .string()
  .url("Nieprawidłowy adres URL biletów")
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

const commonEventFields = {
  name: z.string().min(1, "Nazwa wydarzenia jest wymagana"),
  startsAt: startsAtSchema,
  city: z.string().min(1, "Miasto jest wymagane"),
  venueName: z.string().min(1, "Nazwa miejsca jest wymagana"),
  subgenres: z.array(subgenreSchema).min(1, "Wybierz co najmniej jeden podgatunek"),
  lineup: z.array(z.string()).optional().nullable(),
  ticketUrl: ticketUrlSchema,
  isFree: z.boolean().optional().default(false),
  price: z.string().optional().nullable(),
};

const eventCreateAddressSchema = z.object({
  locationMode: z.literal("address"),
  addressStreet: z.string().min(1, "Ulica jest wymagana"),
  addressNumber: z.string().min(1, "Numer budynku jest wymagany"),
  ...commonEventFields,
});

const eventCreateCoordinatesSchema = z.object({
  locationMode: z.literal("coordinates"),
  latitude: z.number({ required_error: "Szerokość geograficzna jest wymagana" }),
  longitude: z.number({ required_error: "Długość geograficzna jest wymagana" }),
  addressStreet: z.string().optional().nullable(),
  addressNumber: z.string().optional().nullable(),
  ...commonEventFields,
});

const eventCreateDiscriminatedSchema = z.discriminatedUnion("locationMode", [
  eventCreateAddressSchema,
  eventCreateCoordinatesSchema,
]);

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
    venueName: z.string().min(1, "Nazwa miejsca jest wymagana").optional(),
    subgenres: z.array(subgenreSchema).min(1, "Wybierz co najmniej jeden podgatunek").optional(),
    lineup: z.array(z.string()).optional().nullable(),
    ticketUrl: ticketUrlSchema,
    isFree: z.boolean().optional(),
    price: z.string().optional().nullable(),
    locationMode: z.enum(["address", "coordinates"]).optional(),
    addressStreet: z.string().min(1, "Ulica jest wymagana").optional().nullable(),
    addressNumber: z.string().min(1, "Numer budynku jest wymagany").optional().nullable(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
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
export { eventCreateAddressSchema, eventCreateCoordinatesSchema, eventUpdatePartialSchema };
