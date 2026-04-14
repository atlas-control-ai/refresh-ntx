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
  const { error } = await supabase
    .from("students")
    .update(data)
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
    .update({
      is_unenrolled: false,
      unenrolled_at: null,
    })
    .eq("id", studentId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return { success: true };
}
