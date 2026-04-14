"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markDistribution(
  enrollmentId: string,
  method: "pickup" | "school_delivery" | "bin",
  completed: boolean
) {
  const supabase = await createClient();

  // Check if distribution record exists for this enrollment + method
  const { data: existing } = await supabase
    .from("distributions")
    .select("id")
    .eq("enrollment_id", enrollmentId)
    .eq("method", method)
    .single();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from("distributions")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    // Create new record
    const { error } = await supabase.from("distributions").insert({
      enrollment_id: enrollmentId,
      method,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/distribution");
  return { success: true };
}

export async function markPickup(enrollmentId: string) {
  return markDistribution(enrollmentId, "pickup", true);
}
