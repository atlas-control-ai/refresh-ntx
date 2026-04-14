"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateStudent(
  studentId: string,
  data: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    school_student_id: string | null;
    ethnicity: string[];
    ethnic_hair_preference: boolean;
    notes: string | null;
  }
) {
  const supabase = await createClient();

  // Check trust level — if verified (3), don't allow student_id changes unless admin overrides
  const { data: existing } = await supabase
    .from("students")
    .select("school_student_id, student_id_trust_level")
    .eq("id", studentId)
    .single();

  // If trust level is verified and student_id is changing, reset verification
  const resetTrust =
    existing?.student_id_trust_level === 3 &&
    data.school_student_id !== existing.school_student_id;

  const { error } = await supabase
    .from("students")
    .update({
      ...data,
      ...(resetTrust
        ? {
            student_id_trust_level: 1,
            student_id_verified_by: null,
            student_id_verified_at: null,
          }
        : {}),
    })
    .eq("id", studentId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return { success: true };
}

export async function unenrollStudent(studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      is_unenrolled: true,
      unenrolled_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return { success: true };
}

export async function reenrollStudent(studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ is_unenrolled: false, unenrolled_at: null })
    .eq("id", studentId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return { success: true };
}

export async function verifyStudentId(studentId: string, verifiedBy: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      student_id_trust_level: 3,
      student_id_verified_by: verifiedBy,
      student_id_verified_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/students/${studentId}`);
  return { success: true };
}

export async function setStudentIdTrustLevel(studentId: string, level: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      student_id_trust_level: level,
      ...(level !== 3 ? { student_id_verified_by: null, student_id_verified_at: null } : {}),
    })
    .eq("id", studentId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/students/${studentId}`);
  return { success: true };
}

export async function setPackCodeOverride(
  enrollmentId: string,
  override: string | null,
  reason: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .update({
      pack_code_override: override,
      pack_code_override_reason: reason,
    })
    .eq("id", enrollmentId);

  if (error) return { error: error.message };
  revalidatePath("/admin/students");
  return { success: true };
}
