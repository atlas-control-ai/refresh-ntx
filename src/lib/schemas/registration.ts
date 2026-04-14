import { z } from "zod";

const childSchema = z.object({
  childFirstName: z.string().min(1, "Required"),
  childLastName: z.string().min(1, "Required"),
  schoolStudentId: z.string().optional(),
  dateOfBirth: z.string().min(1, "Required"),
  grade: z.string().min(1, "Required"),
  gender: z.enum(["Male", "Female", "Non-binary", "Prefer not to say"]),
  ethnicity: z.array(z.string()).min(1, "Select at least one"),
  schoolDistrict: z.string().min(1, "Required"),
  schoolName: z.string().min(1, "Required"),
  ethnicHairPreference: z.enum(["true", "false"]),
  menstruationPreference: z.enum(["Pads", "Tampons", "None"]).optional().nullable(),
});

export const registrationSchema = z.object({
  // Guardian/household info (entered once)
  guardianFirstName: z.string().min(1, "Required"),
  guardianLastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(1, "Required")
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Format: (XXX) XXX-XXXX"),
  zipCode: z
    .string()
    .min(1, "Required")
    .regex(/^\d{5}$/, "Must be 5 digits"),
  county: z.string().min(1, "Required"),
  // Children array
  children: z.array(childSchema).min(1, "At least one child is required"),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
export type ChildFormData = z.infer<typeof childSchema>;

export const GRADES = [
  "PK", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
];

export const DISTRICTS = [
  "Frisco ISD",
  "Little Elm ISD",
  "Denton ISD",
  "North Texas Collegiate Academy",
  "Other",
];

export const ETHNICITIES = [
  "Hispanic",
  "African American",
  "White",
  "Asian",
  "Native American",
  "Other",
];

export const COUNTIES = [
  "Collin", "Denton", "Dallas", "Tarrant", "Rockwall",
  "Kaufman", "Ellis", "Johnson", "Parker", "Wise", "Other",
];
