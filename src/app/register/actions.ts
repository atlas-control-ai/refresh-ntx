"use server";

import { createClient } from "@/lib/supabase/server";
import { registrationSchema, type RegistrationFormData } from "@/lib/schemas/registration";
import { calculatePackCode } from "@/lib/pack-code";

export type RegistrationResult = {
  success: boolean;
  refreshId?: number;
  error?: string;
};

export async function submitRegistration(
  formData: RegistrationFormData
): Promise<RegistrationResult> {
  // Validate
  const parsed = registrationSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // 1. Check for open cycle
  const { data: openCycle } = await supabase
    .from("cycles")
    .select("id")
    .eq("is_open", true)
    .single();

  if (!openCycle) {
    return { success: false, error: "Registration is currently closed." };
  }

  // 2. Calculate pack code
  const gradeForCode = data.grade === "K" ? "0" : data.grade;
  const packCode = calculatePackCode(
    gradeForCode,
    data.gender,
    data.ethnicHairPreference === "true",
    data.gender === "Female" && data.menstruationPreference
      ? data.menstruationPreference
      : null
  );

  // 3. Check for duplicates
  let isDuplicate = false;
  let duplicateNotes = "";

  const { data: potentialDupes } = await supabase
    .from("students")
    .select("id, first_name, last_name, date_of_birth, school_student_id, refresh_id")
    .or(
      `and(first_name.ilike.${data.childFirstName},last_name.ilike.${data.childLastName}),date_of_birth.eq.${data.dateOfBirth}${
        data.schoolStudentId
          ? `,school_student_id.eq.${data.schoolStudentId}`
          : ""
      }`
    );

  if (potentialDupes && potentialDupes.length > 0) {
    // Check each potential match for 2+ matching signals
    for (const dupe of potentialDupes) {
      let signals = 0;
      if (
        dupe.first_name.toLowerCase() === data.childFirstName.toLowerCase() &&
        dupe.last_name.toLowerCase() === data.childLastName.toLowerCase()
      ) {
        signals++;
      }
      if (dupe.date_of_birth === data.dateOfBirth) {
        signals++;
      }
      if (
        data.schoolStudentId &&
        dupe.school_student_id === data.schoolStudentId
      ) {
        signals++;
      }

      if (signals >= 2) {
        isDuplicate = true;
        duplicateNotes += `Possible match: ${dupe.first_name} ${dupe.last_name} (Refresh ID: ${dupe.refresh_id}). `;
      }
    }
  }

  // 4. Insert student
  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      first_name: data.childFirstName,
      last_name: data.childLastName,
      date_of_birth: data.dateOfBirth,
      school_student_id: data.schoolStudentId || null,
      gender: data.gender,
      ethnicity: data.ethnicity,
      ethnic_hair_preference: data.ethnicHairPreference === "true",
      is_duplicate: isDuplicate,
      notes: isDuplicate ? duplicateNotes.trim() : null,
    })
    .select("id, refresh_id")
    .single();

  if (studentError) {
    return { success: false, error: "Failed to create student record." };
  }

  // 5. Insert guardian
  const { error: guardianError } = await supabase.from("guardians").insert({
    student_id: student.id,
    first_name: data.guardianFirstName,
    last_name: data.guardianLastName,
    email: data.email,
    phone: data.phone,
    zip_code: data.zipCode,
    county: data.county,
    is_primary: true,
  });

  if (guardianError) {
    return { success: false, error: "Failed to save guardian information." };
  }

  // 6. Insert enrollment
  const { error: enrollmentError } = await supabase.from("enrollments").insert({
    student_id: student.id,
    cycle_id: openCycle.id,
    pack_code: packCode,
    grade: data.grade,
    menstruation_preference:
      data.gender === "Female" && data.menstruationPreference
        ? data.menstruationPreference
        : null,
    school_district: data.schoolDistrict,
    school_name: data.schoolName,
  });

  if (enrollmentError) {
    return { success: false, error: "Failed to create enrollment." };
  }

  return { success: true, refreshId: student.refresh_id };
}
