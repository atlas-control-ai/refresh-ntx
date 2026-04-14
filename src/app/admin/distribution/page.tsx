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

  // Get active program year
  const { data: activeYear } = await supabase
    .from("program_years")
    .select("id, label")
    .eq("is_active", true)
    .single();

  const programYearId = params.year ?? activeYear?.id;

  // Get all program years for selector
  const { data: programYears } = await supabase
    .from("program_years")
    .select("id, label, is_active")
    .order("label", { ascending: false });

  // Get enrollments for the selected program year with distributions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let enrollments: any[] = [];

  if (programYearId) {
    const { data } = await supabase
      .from("enrollments")
      .select(
        `
        id, pack_code, grade, school_district, school_name,
        students!inner(id, refresh_id, first_name, last_name),
        distributions(id, season, method, completed, completed_at)
      `
      )
      .eq("program_year_id", programYearId)
      .order("school_name");

    enrollments = data ?? [];
  }

  // Get distribution dates from cycles
  const { data: cycles } = await supabase
    .from("cycles")
    .select("season, distribution_date")
    .eq("program_year_id", programYearId ?? "");

  const distDates: Record<string, string | null> = {};
  cycles?.forEach((c) => {
    distDates[c.season] = c.distribution_date;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Distribution Tracking</h1>
        <p className="text-sm text-zinc-500">
          Track pack distribution across all four events.
        </p>
      </div>
      <DistributionView
        enrollments={enrollments}
        programYears={programYears ?? []}
        selectedYearId={programYearId ?? ""}
        distDates={distDates}
        isAdmin={role === "admin"}
        search={params.q ?? ""}
        seasonFilter={params.season ?? ""}
      />
    </div>
  );
}
