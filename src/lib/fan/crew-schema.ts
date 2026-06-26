import { z } from "zod";
import { SUBGENRES, type Subgenre } from "@/types";

const subgenreSchema = z.enum(SUBGENRES as [Subgenre, ...Subgenre[]]);

const emptyToNull = (value: unknown) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return value;
};

export const crewIdSchema = z.string().uuid("Nieprawidłowy identyfikator ekipy");

export const crewMemberUserIdSchema = z.string().uuid("Nieprawidłowy identyfikator członka ekipy");

const crewFields = {
  name: z.string().trim().min(1, "Nazwa ekipy jest wymagana").max(80, "Nazwa ekipy może mieć maksymalnie 80 znaków"),
  city: z.preprocess(
    emptyToNull,
    z.string().trim().min(1, "Miasto nie może być puste").max(80, "Miasto może mieć maksymalnie 80 znaków").nullable(),
  ),
  subgenres: z.array(subgenreSchema).max(5, "Możesz wybrać maksymalnie 5 podgatunków"),
  description: z.preprocess(
    emptyToNull,
    z.string().trim().max(500, "Opis ekipy może mieć maksymalnie 500 znaków").nullable(),
  ),
};

export const createCrewSchema = z.object(crewFields);

export const updateCrewSchema = z
  .object({
    name: crewFields.name.optional(),
    city: crewFields.city.optional(),
    subgenres: crewFields.subgenres.optional(),
    description: crewFields.description.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Podaj przynajmniej jedno pole do zmiany");

export const createCrewJoinRequestSchema = z.object({}).strict();

export const respondCrewJoinRequestSchema = z.object({
  status: z.enum(["accepted", "declined"], {
    message: "Status prośby musi mieć wartość accepted albo declined",
  }),
});

export type CreateCrewInput = z.infer<typeof createCrewSchema>;
export type UpdateCrewInput = z.infer<typeof updateCrewSchema>;
export type RespondCrewJoinRequestInput = z.infer<typeof respondCrewJoinRequestSchema>;
