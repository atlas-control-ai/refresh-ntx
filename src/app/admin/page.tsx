import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/get-role";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const role = await getUserRole();

  // Fetch active year and open cycle
  const { data: activeYear } = await supabase
    .from("program_years")
    .select("id, label")
    .eq("is_active", true)
    .single();

  const { data: openCycle } = await supabase
    .from("cycles")
    .select("id, season")
    .eq("is_open", true)
    .single();

  // Summary counts
  const [
    { count: totalStudents },
    { count: pendingDuplicates },
    { count: unenrolled },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_duplicate", true)
      .is("duplicate_of_id", null),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_unenrolled", true),
  ]);

  // Enrollment count for open cycle
  let enrolledThisCycle = 0;
  let distStats = { pickup: 0, schoolDelivery: 0, bin: 0, total: 0 };

  if (openCycle) {
    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("cycle_id", openCycle.id);
    enrolledThisCycle = count ?? 0;
    distStats.total = enrolledThisCycle;

    // Distribution stats for open cycle
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id, distributions(method, completed)")
      .eq("cycle_id", openCycle.id);

    if (enrollments) {
      for (const e of enrollments) {
        const dists = (e as { id: string; distributions: Array<{ method: string; completed: boolean }> }).distributions;
        if (dists?.some((d) => d.method === "pickup" && d.completed)) distStats.pickup++;
        if (dists?.some((d) => d.method === "school_delivery" && d.completed)) distStats.schoolDelivery++;
        if (dists?.some((d) => d.method === "bin" && d.completed)) distStats.bin++;
      }
    }
  }

  const seasonLabels: Record<string, string> = {
    aug: "August",
    nov: "November",
    feb: "February",
    may: "May",
  };

  const pctPickup = distStats.total ? Math.round((distStats.pickup / distStats.total) * 100) : 0;
  const pctSchool = distStats.total ? Math.round((distStats.schoolDelivery / distStats.total) * 100) : 0;
  const pctBin = distStats.total ? Math.round((distStats.bin / distStats.total) * 100) : 0;

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

      {/* Summary cards */}
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
          alert={(pendingDuplicates ?? 0) > 0}
        />
        <SummaryCard
          title="Unenrolled"
          value={unenrolled ?? 0}
          description="Withdrawn from program"
        />
      </div>

      {/* Distribution progress */}
      {openCycle && distStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribution Progress</CardTitle>
            <CardDescription>
              {seasonLabels[openCycle.season]} cycle — {distStats.total} enrolled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressRow
              label="Pickup"
              count={distStats.pickup}
              total={distStats.total}
              pct={pctPickup}
              color="bg-green-500"
            />
            <ProgressRow
              label="School Delivery"
              count={distStats.schoolDelivery}
              total={distStats.total}
              pct={pctSchool}
              color="bg-blue-500"
            />
            <ProgressRow
              label="Bin"
              count={distStats.bin}
              total={distStats.total}
              pct={pctBin}
              color="bg-amber-500"
            />
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      {role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" target="_blank">
                <Button variant="outline">Open Registration Form</Button>
              </Link>
              <Link href="/admin/cycles">
                <Button variant="outline">Manage Cycles</Button>
              </Link>
              <Link href="/admin/students">
                <Button variant="outline">View All Students</Button>
              </Link>
              {(pendingDuplicates ?? 0) > 0 && (
                <Link href="/admin/duplicates">
                  <Button variant="outline">Review Duplicates ({pendingDuplicates})</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  alert,
}: {
  title: string;
  value: number | string;
  description: string;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-amber-300" : ""}>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className={`text-3xl ${alert ? "text-amber-700" : ""}`}>
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-zinc-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function ProgressRow({
  label,
  count,
  total,
  pct,
  color,
}: {
  label: string;
  count: number;
  total: number;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-700">{label}</span>
        <span className="text-zinc-500">
          {count} / {total} ({pct}%)
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
