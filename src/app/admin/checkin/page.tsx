import { createClient } from "@/lib/supabase/server";
import { CheckInView } from "./checkin-view";

export default async function CheckInPage() {
  const supabase = await createClient();

  // Get the active program year
  const { data: activeYear } = await supabase
    .from("program_years")
    .select("id, label")
    .eq("is_active", true)
    .single();

  if (!activeYear) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg text-zinc-500">No active program year.</p>
      </div>
    );
  }

  // Fetch all enrollments for the active year
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      `
      id, pack_code_calculated, pack_code_override, grade, school_name,
      students!inner(id, refresh_id, first_name, last_name),
      distributions(id, season, status, completed_at)
    `
    )
    .eq("program_year_id", activeYear.id);

  // Get cycle dates to determine current season
  const { data: cycles } = await supabase
    .from("cycles")
    .select("season, distribution_date")
    .eq("program_year_id", activeYear.id)
    .order("distribution_date");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Event Check-In</h1>
        <p className="text-sm text-zinc-500">
          {activeYear.label} — search by name or Refresh ID to mark pickup
        </p>
      </div>
      <CheckInView
        enrollments={enrollments ?? []}
        cycles={cycles ?? []}
      />
    </div>
  );
}
