"use server";

import { createClient } from "@/lib/supabase/server";
import { registrationSchema, type RegistrationFormData } from "@/lib/schemas/registration";
import { calculatePackCode } from "@/lib/pack-code";

export type RegistrationResult = {
  success: boolean;
  refreshIds?: number[];
  error?: string;
};

function calculateTrustLevel(
  schoolStudentId: string | undefined,
  conflictFound: boolean
): number {
  if (!schoolStudentId) return 0; // No ID provided
  if (conflictFound) return 2; // Conflict detected
  return 1; // Has ID, no conflicts
}

export async function submitRegistration(
  formData: RegistrationFormData
): Promise<RegistrationResult> {
  const parsed = registrationSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // 1. Check for active program year with registration open
  const { data: activeYear } = await supabase
    .from("program_years")
    .select("id")
    .eq("is_active", true)
    .eq("is_registration_open", true)
    .single();

  if (!activeYear) {
    return { success: false, error: "Registration is currently closed." };
  }

  // 2. Look up or create household by email
  const emailLower = data.email.toLowerCase();
  let householdId: string;

  const { data: existingHousehold } = await supabase
    .from("households")
    .select("id")
    .ilike("primary_email", emailLower)
    .single();

  if (existingHousehold) {
    householdId = existingHousehold.id;
  } else {
    const { data: newHousehold, error: hhError } = await supabase
      .from("households")
      .insert({
        primary_email: emailLower,
        primary_phone: data.phone,
      })
      .select("id")
      .single();

    if (hhError || !newHousehold) {
      return { success: false, error: "Failed to create household." };
    }
    householdId = newHousehold.id;
  }

  const refreshIds: number[] = [];

  // 3. Process each child
  for (const child of data.children) {
    // Calculate pack code
    const gradeForCode = child.grade === "K" ? "0" : child.grade;
    const packCode = calculatePackCode(
      gradeForCode,
      child.gender,
      child.ethnicHairPreference === "true",
      child.gender === "Female" && child.menstruationPreference
        ? child.menstruationPreference
        : null
    );

    // Duplicate detection
    let isDuplicate = false;
    let duplicateNotes = "";

    const { data: potentialDupes } = await supabase
      .from("students")
      .select("id, first_name, last_name, date_of_birth, school_student_id, refresh_id")
      .or(
        `and(first_name.ilike.${child.childFirstName},last_name.ilike.${child.childLastName}),date_of_birth.eq.${child.dateOfBirth}${
          child.schoolStudentId
            ? `,school_student_id.eq.${child.schoolStudentId}`
            : ""
        }`
      );

    if (potentialDupes && potentialDupes.length > 0) {
      for (const dupe of potentialDupes) {
        let signals = 0;
        if (
          dupe.first_name.toLowerCase() === child.childFirstName.toLowerCase() &&
          dupe.last_name.toLowerCase() === child.childLastName.toLowerCase()
        )
          signals++;
        if (dupe.date_of_birth === child.dateOfBirth) signals++;
        if (child.schoolStudentId && dupe.school_student_id === child.schoolStudentId)
          signals++;

        if (signals >= 2) {
          isDuplicate = true;
          duplicateNotes += `Possible match: ${dupe.first_name} ${dupe.last_name} (Refresh ID: ${dupe.refresh_id}). `;
        }
      }
    }

    // Student ID trust level
    let idConflict = false;
    if (child.schoolStudentId) {
      const { data: idConflicts } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("school_student_id", child.schoolStudentId)
        .limit(1);
      idConflict = (idConflicts?.length ?? 0) > 0;
    }
    const trustLevel = calculateTrustLevel(child.schoolStudentId, idConflict);

    // Insert student
    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({
        household_id: householdId,
        first_name: child.childFirstName,
        last_name: child.childLastName,
        date_of_birth: child.dateOfBirth,
        school_student_id: child.schoolStudentId || null,
        gender: child.gender,
        ethnicity: child.ethnicity,
        ethnic_hair_preference: child.ethnicHairPreference === "true",
        is_duplicate: isDuplicate,
        notes: isDuplicate ? duplicateNotes.trim() : null,
        student_id_trust_level: trustLevel,
      })
      .select("id, refresh_id")
      .single();

    if (studentError) {
      return {
        success: false,
        error: `Failed to register ${child.childFirstName}: ${studentError.message}`,
      };
    }

    // Insert guardian linked to both student and household
    await supabase.from("guardians").insert({
      student_id: student.id,
      household_id: householdId,
      first_name: data.guardianFirstName,
      last_name: data.guardianLastName,
      email: data.email,
      phone: data.phone,
      zip_code: data.zipCode,
      county: data.county,
      is_primary: true,
    });

    // Insert enrollment (trigger auto-creates 4 distribution records)
    await supabase.from("enrollments").insert({
      student_id: student.id,
      program_year_id: activeYear.id,
      pack_code_calculated: packCode,
      grade: child.grade,
      menstruation_preference:
        child.gender === "Female" && child.menstruationPreference
          ? child.menstruationPreference
          : null,
      school_district: child.schoolDistrict,
      school_name: child.schoolName,
    });

    refreshIds.push(student.refresh_id);
  }

  return { success: true, refreshIds };
}
