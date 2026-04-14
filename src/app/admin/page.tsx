import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch summary data
  const [
    { count: totalStudents },
    { data: activeYear },
    { data: openCycle },
    { count: pendingDuplicates },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase
      .from("program_years")
      .select("label")
      .eq("is_active", true)
      .single(),
    supabase
      .from("cycles")
      .select("id, season, is_open, program_year_id")
      .eq("is_open", true)
      .single(),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_duplicate", true),
  ]);

  // Get enrollment count for open cycle
  let enrolledThisCycle = 0;
  if (openCycle) {
    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", openCycle.id);
    enrolledThisCycle = count ?? 0;
  }

  const seasonLabels: Record<string, string> = {
    aug: "August",
    nov: "November",
    feb: "February",
    may: "May",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          {activeYear?.label ?? "No active year"}{" "}
          {openCycle
            ? `\u2014 ${seasonLabels[openCycle.season] ?? openCycle.season} cycle (open)`
            : "\u2014 No cycle open"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Enrolled This Cycle"
          value={enrolledThisCycle}
          description="Current open cycle"
        />
        <SummaryCard
          title="Total Students"
          value={totalStudents ?? 0}
          description="All-time registry"
        />
        <SummaryCard
          title="Pending Duplicates"
          value={pendingDuplicates ?? 0}
          description="Needs review"
        />
        <SummaryCard
          title="Program Year"
          value={activeYear?.label ?? "N/A"}
          description="Currently active"
        />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number | string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-zinc-500">{description}</p>
      </CardContent>
    </Card>
  );
}
