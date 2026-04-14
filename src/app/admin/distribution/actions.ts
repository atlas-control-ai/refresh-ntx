"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DistributionStatus } from "@/lib/types";

export async function updateDistributionStatus(
  distributionId: string,
  status: DistributionStatus
) {
  const supabase = await createClient();
  const completedStatuses = ["picked_up", "school_delivered", "binned"];

  const { error } = await supabase
    .from("distributions")
    .update({
      status,
      completed_at: completedStatuses.includes(status) ? new Date().toISOString() : null,
    })
    .eq("id", distributionId);

  if (error) return { error: error.message };
  revalidatePath("/admin/distribution");
  return { success: true };
}

export async function markPickup(enrollmentId: string, season: string) {
  const supabase = await createClient();
  const { data: dist } = await supabase
    .from("distributions")
    .select("id")
    .eq("enrollment_id", enrollmentId)
    .eq("season", season)
    .single();

  if (!dist) return { error: "Distribution record not found" };
  return updateDistributionStatus(dist.id, "picked_up");
}
