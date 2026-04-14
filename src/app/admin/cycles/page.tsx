import { createClient } from "@/lib/supabase/server";
import { CycleManagement } from "./cycle-management";

export default async function CyclesPage() {
  const supabase = await createClient();

  const { data: programYears } = await supabase
    .from("program_years")
    .select(
      `
      id, label, is_active, is_registration_open, created_at,
      cycles(id, season, distribution_date, is_open, created_at)
    `
    )
    .order("label", { ascending: false });

  // Get enrollment counts per program year
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("program_year_id");

  const enrollmentCounts: Record<string, number> = {};
  enrollments?.forEach((e) => {
    enrollmentCounts[e.program_year_id] = (enrollmentCounts[e.program_year_id] ?? 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Cycle &amp; Program Year Management
        </h1>
        <p className="text-sm text-zinc-500">
          Create program years, set distribution dates, and control registration.
        </p>
      </div>
      <CycleManagement
        programYears={(programYears ?? []) as Array<{
          id: string;
          label: string;
          is_active: boolean;
          is_registration_open: boolean;
          created_at: string;
          cycles: Array<{ id: string; season: string; distribution_date: string | null; is_open: boolean; created_at: string }>;
        }>}
        enrollmentCounts={enrollmentCounts}
      />
    </div>
  );
}
