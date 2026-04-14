import { createClient } from "@/lib/supabase/server";
import { CheckInView } from "./checkin-view";

export default async function CheckInPage() {
  const supabase = await createClient();

  // Get the open cycle
  const { data: openCycle } = await supabase
    .from("cycles")
    .select("id, season, program_years(label)")
    .eq("is_open", true)
    .single();

  if (!openCycle) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-lg text-zinc-500">No cycle is currently open.</p>
      </div>
    );
  }

  // Fetch all enrollments for the open cycle
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      `
      id, pack_code, grade, school_name,
      students!inner(id, refresh_id, first_name, last_name),
      distributions(id, method, completed, completed_at)
    `
    )
    .eq("cycle_id", openCycle.id);

  const seasonLabels: Record<string, string> = {
    aug: "August",
    nov: "November",
    feb: "February",
    may: "May",
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Event Check-In</h1>
        <p className="text-sm text-zinc-500">
          {openCycle.program_years?.label} {seasonLabels[openCycle.season] ?? openCycle.season} — search by name or Refresh ID to mark pickup
        </p>
      </div>
      <CheckInView enrollments={(enrollments as typeof enrollments & Array<{ students: { id: string; refresh_id: number; first_name: string; last_name: string } }>) ?? []} />
    </div>
  );
}
