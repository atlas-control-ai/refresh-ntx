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

const SEASONS = ["aug", "nov", "feb", "may"] as const;
const SEASON_LABELS: Record<string, string> = {
  aug: "August",
  nov: "November",
  feb: "February",
  may: "May",
};

export default async function AdminDashboard() {
  const supabase = await createClient();
  const role = await getUserRole();

  const { data: activeYear } = await supabase
    .from("program_years")
    .select("id, label, is_registration_open")
    .eq("is_active", true)
    .single();

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

  let enrolledThisYear = 0;
  const seasonStats: Record<string, { pickup: number; school: number; bin: number }> = {};
  SEASONS.forEach((s) => (seasonStats[s] = { pickup: 0, school: 0, bin: 0 }));

  if (activeYear) {
    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("program_year_id", activeYear.id);
    enrolledThisYear = count ?? 0;

    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("id, distributions(season, method, completed)")
      .eq("program_year_id", activeYear.id);

    if (enrollments) {
      for (const e of enrollments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dists = (e as any).distributions as Array<{ season: string; method: string; completed: boolean }>;
        for (const d of dists ?? []) {
          if (d.completed && seasonStats[d.season]) {
            if (d.method === "pickup") seasonStats[d.season].pickup++;
            else if (d.method === "school_delivery") seasonStats[d.season].school++;
            else if (d.method === "bin") seasonStats[d.season].bin++;
          }
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          {activeYear?.label ?? "No active year"}
          {activeYear?.is_registration_open ? " — Registration open" : " — Registration closed"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Enrolled This Year" value={enrolledThisYear} description={activeYear?.label ?? ""} />
        <SummaryCard title="Total Students" value={totalStudents ?? 0} description="All-time registry" />
        <SummaryCard title="Pending Duplicates" value={pendingDuplicates ?? 0} description="Needs review" alert={(pendingDuplicates ?? 0) > 0} />
        <SummaryCard title="Unenrolled" value={unenrolled ?? 0} description="Withdrawn from program" />
      </div>

      {/* Distribution progress per season */}
      {activeYear && enrolledThisYear > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribution Progress</CardTitle>
            <CardDescription>{activeYear.label} — {enrolledThisYear} enrolled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SEASONS.map((s) => {
                const st = seasonStats[s];
                const anyDist = st.pickup + st.school + st.bin;
                return (
                  <div key={s} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{SEASON_LABELS[s]}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <ProgressRow label="Pickup" count={st.pickup} total={enrolledThisYear} />
                      <ProgressRow label="School" count={st.school} total={enrolledThisYear} />
                      <ProgressRow label="Bin" count={st.bin} total={enrolledThisYear} />
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">
                      {anyDist} of {enrolledThisYear} received
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {role === "admin" && (
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" target="_blank"><Button variant="outline">Open Registration Form</Button></Link>
              <Link href="/admin/cycles"><Button variant="outline">Manage Cycles</Button></Link>
              <Link href="/admin/students"><Button variant="outline">View All Students</Button></Link>
              {(pendingDuplicates ?? 0) > 0 && (
                <Link href="/admin/duplicates"><Button variant="outline">Review Duplicates ({pendingDuplicates})</Button></Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ title, value, description, alert }: { title: string; value: number | string; description: string; alert?: boolean }) {
  return (
    <Card className={alert ? "border-amber-300" : ""}>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className={`text-3xl ${alert ? "text-amber-700" : ""}`}>{value}</CardTitle>
      </CardHeader>
      <CardContent><p className="text-xs text-zinc-500">{description}</p></CardContent>
    </Card>
  );
}

function ProgressRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-zinc-600">
        <span>{label}</span>
        <span>{count} ({pct}%)</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-zinc-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
