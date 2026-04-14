import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/get-role";
import { DistributionView } from "./distribution-view";

export default async function DistributionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const role = await getUserRole();

  // Get all cycles for the selector
  const { data: cycles } = await supabase
    .from("cycles")
    .select("id, season, distribution_date, is_open, program_years(label)")
    .order("created_at", { ascending: false });

  // Default to the open cycle or the first one
  const openCycle = cycles?.find((c) => c.is_open);
  const selectedCycleId = params.cycle ?? openCycle?.id ?? cycles?.[0]?.id ?? "";

  // Get enrollments for the selected cycle with student + distribution data
  let enrollments: Array<{
    id: string;
    pack_code: string;
    grade: string;
    school_district: string;
    school_name: string;
    student_id: string;
    students: { id: string; refresh_id: number; first_name: string; last_name: string };
    distributions: Array<{ id: string; method: string; completed: boolean; completed_at: string | null }>;
  }> = [];

  if (selectedCycleId) {
    const { data } = await supabase
      .from("enrollments")
      .select(
        `
        id, pack_code, grade, school_district, school_name, student_id,
        students!inner(id, refresh_id, first_name, last_name),
        distributions(id, method, completed, completed_at)
      `
      )
      .eq("cycle_id", selectedCycleId)
      .order("school_name");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enrollments = (data as any) ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Distribution Tracking</h1>
        <p className="text-sm text-zinc-500">
          Track pack distribution by pickup, school delivery, and bin.
        </p>
      </div>
      <DistributionView
        enrollments={enrollments}
        cycles={cycles ?? []}
        selectedCycleId={selectedCycleId}
        isAdmin={role === "admin"}
        search={params.q ?? ""}
        methodFilter={params.method ?? ""}
      />
    </div>
  );
}
