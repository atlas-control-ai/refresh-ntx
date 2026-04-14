"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markDistribution(
  enrollmentId: string,
  season: "aug" | "nov" | "feb" | "may",
  method: "pickup" | "school_delivery" | "bin",
  completed: boolean
) {
  const supabase = await createClient();

  // Check if distribution record exists for this enrollment + season + method
  const { data: existing } = await supabase
    .from("distributions")
    .select("id")
    .eq("enrollment_id", enrollmentId)
    .eq("season", season)
    .eq("method", method)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("distributions")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("distributions").insert({
      enrollment_id: enrollmentId,
      season,
      method,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/distribution");
  return { success: true };
}

export async function markPickup(enrollmentId: string, season: "aug" | "nov" | "feb" | "may") {
  return markDistribution(enrollmentId, season, "pickup", true);
}
