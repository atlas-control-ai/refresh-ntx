"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createProgramYear(label: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("program_years")
    .insert({ label, is_active: false })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Create four cycles for the new year
  const seasons = ["aug", "nov", "feb", "may"] as const;
  const { error: cycleError } = await supabase.from("cycles").insert(
    seasons.map((season) => ({
      program_year_id: data.id,
      season,
      is_open: false,
    }))
  );

  if (cycleError) return { error: cycleError.message };

  revalidatePath("/admin/cycles");
  return { success: true };
}

export async function setActiveYear(yearId: string) {
  const supabase = await createClient();

  // Deactivate all years
  const { error: deactivateError } = await supabase
    .from("program_years")
    .update({ is_active: false })
    .neq("id", "00000000-0000-0000-0000-000000000000"); // match all

  if (deactivateError) return { error: deactivateError.message };

  // Activate the selected year
  const { error } = await supabase
    .from("program_years")
    .update({ is_active: true })
    .eq("id", yearId);

  if (error) return { error: error.message };

  revalidatePath("/admin/cycles");
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleRegistrationOpen(yearId: string, isOpen: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("program_years")
    .update({ is_registration_open: isOpen })
    .eq("id", yearId);

  if (error) return { error: error.message };

  revalidatePath("/admin/cycles");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateDistributionDate(
  cycleId: string,
  date: string | null
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cycles")
    .update({ distribution_date: date || null })
    .eq("id", cycleId);

  if (error) return { error: error.message };

  revalidatePath("/admin/cycles");
  return { success: true };
}
