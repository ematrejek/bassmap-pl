import { z } from "zod";

export const attendanceStatusSchema = z.enum(["going", "interested"]);

export const setAttendanceBodySchema = z.object({
  status: attendanceStatusSchema,
});

export type ParsedAttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export function parseAttendanceStatus(
  input: unknown,
): { success: true; data: ParsedAttendanceStatus } | { success: false; error: string } {
  const result = attendanceStatusSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: "Nieprawidłowy status uczestnictwa" };
  }

  return { success: true, data: result.data };
}
