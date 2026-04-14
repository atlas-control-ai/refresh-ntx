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

  const { data: activeYear } = await supabase
    .from("program_years")
    .select("id, label, is_registration_open")
    .eq("is_active", true)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let enrollments: any[] = [];

  if (activeYear) {
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
      .eq("program_year_id", activeYear.id)
      .order("submitted_at", { ascending: false });

    enrollments = (data ?? []).map((e: Record<string, unknown>) => ({
      ...e,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guardians: (e.students as any)?.guardians ?? [],
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Registrations</h1>
        <p className="text-sm text-zinc-500">
          {activeYear
            ? `${activeYear.label} — ${enrollments.length} registrations${activeYear.is_registration_open ? " (registration open)" : ""}`
            : "No active program year."}
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {enrollments.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-sm">
                    <Link href={`/admin/students/${e.students.id}`} className="hover:underline">
                      {e.students.refresh_id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/students/${e.students.id}`} className="font-medium hover:underline">
                      {e.students.first_name} {e.students.last_name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-zinc-500">
                    {e.guardians[0] ? `${e.guardians[0].first_name} ${e.guardians[0].last_name}` : "—"}
                  </TableCell>
                  <TableCell>{e.grade}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-zinc-500">{e.school_name}</TableCell>
                  <TableCell><Badge variant="secondary">{e.pack_code}</Badge></TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {new Date(e.submitted_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {e.students.is_duplicate && (
                      <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs">Dup</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-zinc-500">No registrations yet for this year.</p>
        </div>
      )}
    </div>
  );
}
