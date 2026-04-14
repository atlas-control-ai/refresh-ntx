"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function confirmDuplicate(
  duplicateStudentId: string,
  canonicalStudentId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("students")
    .update({
      is_duplicate: true,
      duplicate_of_id: canonicalStudentId,
    })
    .eq("id", duplicateStudentId);

  if (error) return { error: error.message };

  revalidatePath("/admin/duplicates");
  revalidatePath("/admin/students");
  return { success: true };
}

export async function dismissDuplicate(studentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("students")
    .update({
      is_duplicate: false,
      duplicate_of_id: null,
      notes: null,
    })
    .eq("id", studentId);

  if (error) return { error: error.message };

  revalidatePath("/admin/duplicates");
  revalidatePath("/admin/students");
  return { success: true };
}
