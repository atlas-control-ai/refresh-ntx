import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function RegistrationsPage() {
  const supabase = await createClient();

  // Get the open cycle
  const { data: openCycle } = await supabase
    .from("cycles")
    .select("id, season, is_open, program_years(label)")
    .eq("is_open", true)
    .single();

  const cycleId = openCycle?.id;

  const seasonLabels: Record<string, string> = {
    aug: "August",
    nov: "November",
    feb: "February",
    may: "May",
  };

  // Get enrollments for this cycle, sorted by submission date
  let enrollments: Array<{
    id: string;
    pack_code: string;
    grade: string;
    school_name: string;
    submitted_at: string;
    students: { id: string; refresh_id: number; first_name: string; last_name: string; is_duplicate: boolean };
    guardians: Array<{ first_name: string; last_name: string; email: string }>;
  }> = [];

  if (cycleId) {
    const { data } = await supabase
      .from("enrollments")
      .select(
        `
        id, pack_code, grade, school_name, submitted_at,
        students!inner(id, refresh_id, first_name, last_name, is_duplicate,
          guardians(first_name, last_name, email)
        )
      `
      )
      .eq("cycle_id", cycleId)
      .order("submitted_at", { ascending: false });

    // Flatten the nested guardians
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enrollments = (data ?? []).map((e: any) => ({
      ...e,
      guardians: e.students?.guardians ?? [],
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Registrations</h1>
        <p className="text-sm text-zinc-500">
          {openCycle
            ? `${openCycle.program_years?.label} ${seasonLabels[openCycle.season] ?? openCycle.season} — ${enrollments.length} registrations`
            : "No cycle is currently open."}
        </p>
      </div>

      {enrollments.length > 0 ? (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Refresh ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="hidden md:table-cell">Guardian</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="hidden md:table-cell">School</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-16">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-sm">
                    <Link
                      href={`/admin/students/${e.students.id}`}
                      className="hover:underline"
                    >
                      {e.students.refresh_id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/students/${e.students.id}`}
                      className="font-medium hover:underline"
                    >
                      {e.students.first_name} {e.students.last_name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-zinc-500">
                    {e.guardians[0]
                      ? `${e.guardians[0].first_name} ${e.guardians[0].last_name}`
                      : "—"}
                  </TableCell>
                  <TableCell>{e.grade}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-zinc-500">
                    {e.school_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{e.pack_code}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {new Date(e.submitted_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {e.students.is_duplicate && (
                      <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs">
                        Dup
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-zinc-500">No registrations yet for this cycle.</p>
        </div>
      )}
    </div>
  );
}
