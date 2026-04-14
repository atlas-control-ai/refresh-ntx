import { createClient } from "@/lib/supabase/server";
import { ReportsView } from "./reports-view";

export default async function ReportsPage() {
  const supabase = await createClient();

  // Get all cycles
  const { data: cycles } = await supabase
    .from("cycles")
    .select("id, season, is_open, program_years(label)")
    .order("created_at", { ascending: false });

  // Find the open cycle or default to first
  const openCycle = cycles?.find((c) => c.is_open) ?? cycles?.[0];
  const selectedCycleId = openCycle?.id ?? "";

  // Enrollment data for default cycle
  let enrollmentData: Array<{
    pack_code: string;
    grade: string;
    school_district: string;
    school_name: string;
    students: { gender: string; ethnicity: string[]; date_of_birth: string };
    distributions: Array<{ method: string; completed: boolean }>;
  }> = [];

  if (selectedCycleId) {
    const { data } = await supabase
      .from("enrollments")
      .select(
        `
        pack_code, grade, school_district, school_name,
        students!inner(gender, ethnicity, date_of_birth),
        distributions(method, completed)
      `
      )
      .eq("cycle_id", selectedCycleId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enrollmentData = (data as any) ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Reports</h1>
        <p className="text-sm text-zinc-500">
          Enrollment and distribution breakdowns with CSV export.
        </p>
      </div>
      <ReportsView
        cycles={cycles ?? []}
        defaultCycleId={selectedCycleId}
        enrollmentData={enrollmentData}
      />
    </div>
  );
}
