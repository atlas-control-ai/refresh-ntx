import { createClient } from "@/lib/supabase/server";
import { ReportsView } from "./reports-view";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: programYears } = await supabase
    .from("program_years")
    .select("id, label, is_active")
    .order("label", { ascending: false });

  const activeYear = programYears?.find((py) => py.is_active) ?? programYears?.[0];
  const selectedYearId = params.year ?? activeYear?.id ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let enrollmentData: any[] = [];

  if (selectedYearId) {
    const { data } = await supabase
      .from("enrollments")
      .select(
        `
        pack_code_calculated, pack_code_override, grade, school_district, school_name,
        students!inner(gender, ethnicity, date_of_birth),
        distributions(season, status)
      `
      )
      .eq("program_year_id", selectedYearId);

    enrollmentData = data ?? [];
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
        programYears={programYears ?? []}
        defaultYearId={selectedYearId}
        enrollmentData={enrollmentData}
      />
    </div>
  );
}
