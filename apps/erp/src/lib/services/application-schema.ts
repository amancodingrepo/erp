import { z } from "zod";

const emptyToUndef = (value: unknown) =>
  value === "" || value === null ? undefined : value;
const optStr = z.preprocess(emptyToUndef, z.string().min(1).optional());
const optEmail = z.preprocess(emptyToUndef, z.string().email().optional());

export const PREVIOUS_QUALIFICATIONS = [
  "Nursery / KG",
  "Class 5",
  "Class 8",
  "Class 10 (SSC / Matric)",
  "Class 12 (HSC / Intermediate)",
  "Diploma",
  "Graduation",
  "Post graduation",
  "Other",
] as const;

export const applicationCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: optStr,
  email: optEmail,
  mobile: optStr,
  dob: optStr,
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  fatherName: optStr,
  parentEmail: optEmail,
  previousQualification: optStr,
  programId: optStr,
  categoryCode: optStr,
  score: z.union([z.number(), z.string()]).optional(),
  campusCode: optStr,
});

export const publicApplicationSchema = z.object({
  firstName: z.string().min(1, "required"),
  lastName: z.string().min(1, "required"),
  fatherName: z.string().min(1, "required"),
  mobile: z
    .string()
    .regex(/^\d{10}$/, "enter a 10-digit mobile number"),
  email: z.string().email("valid email required"),
  parentEmail: z
    .string()
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "valid email required",
    ),
  dob: z.string().min(1, "required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "required" }),
  programId: z.string().min(1, "select a class or course"),
  previousQualification: z.string().min(1, "required"),
  score: z
    .union([z.string(), z.number()])
    .refine((value) => {
      const n = Number(value);
      return String(value).trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 100;
    }, "enter a percentage from 0 to 100"),
  campusCode: z.string().optional(),
});

export const enrollSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  sessionId: optStr,
  admissionNo: optStr,
});

export const paySchema = z.object({
  method: z.enum(["CASH", "UPI", "CHEQUE"]).default("CASH"),
});
