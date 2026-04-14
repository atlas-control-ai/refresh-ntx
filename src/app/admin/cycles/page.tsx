import { createClient } from "@/lib/supabase/server";
import { CycleManagement } from "./cycle-management";

export default async function CyclesPage() {
  const supabase = await createClient();

  const { data: programYears } = await supabase
    .from("program_years")
    .select(
      `
      id, label, is_active, created_at,
      cycles(id, season, distribution_date, is_open, created_at)
    `
    )
    .order("label", { ascending: false });

  // Get enrollment counts per cycle
  const { data: enrollmentCounts } = await supabase
    .from("enrollments")
    .select("cycle_id")
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach((e) => {
        counts[e.cycle_id] = (counts[e.cycle_id] ?? 0) + 1;
      });
      return { data: counts };
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Cycle &amp; Program Year Management
        </h1>
        <p className="text-sm text-zinc-500">
          Create program years, configure cycles, and control registration windows.
        </p>
      </div>
      <CycleManagement
        programYears={programYears ?? []}
        enrollmentCounts={enrollmentCounts ?? {}}
      />
    </div>
  );
}
