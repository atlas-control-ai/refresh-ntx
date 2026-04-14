"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { effectivePackCode, isDistributionCompleted } from "@/lib/types";

interface Enrollment {
  pack_code_calculated: string;
  pack_code_override: string | null;
  grade: string;
  school_district: string;
  school_name: string;
  students: { gender: string; ethnicity: string[]; date_of_birth: string };
  distributions: Array<{ season: string; status: string }>;
}

interface ProgramYear {
  id: string;
  label: string;
  is_active: boolean;
}

const SEASON_LABELS: Record<string, string> = {
  aug: "August",
  nov: "November",
  feb: "February",
  may: "May",
};

export function ReportsView({
  programYears,
  defaultYearId,
  enrollmentData,
}: {
  programYears: ProgramYear[];
  defaultYearId: string;
  enrollmentData: Enrollment[];
}) {
  const router = useRouter();
  const [yearId, setYearId] = useState(defaultYearId);

  function changeYear(id: string) {
    setYearId(id);
    router.push(`/admin/reports?year=${id}`);
  }

  // Breakdowns
  const byPackCode = useMemo(() => countBy(enrollmentData, (e) => effectivePackCode(e)), [enrollmentData]);
  const byDistrict = useMemo(() => countBy(enrollmentData, (e) => e.school_district), [enrollmentData]);
  const bySchool = useMemo(() => countBy(enrollmentData, (e) => e.school_name), [enrollmentData]);
  const byGrade = useMemo(() => countBy(enrollmentData, (e) => e.grade), [enrollmentData]);
  const byGender = useMemo(() => countBy(enrollmentData, (e) => e.students.gender), [enrollmentData]);

  const byEthnicity = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of enrollmentData) {
      for (const eth of e.students.ethnicity) {
        counts[eth] = (counts[eth] ?? 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [enrollmentData]);

  // Distribution completion
  const distReport = useMemo(() => {
    const pickup = enrollmentData.filter((e) =>
      e.distributions.some((d) => d.status === "picked_up")
    ).length;
    const school = enrollmentData.filter((e) =>
      e.distributions.some((d) => d.status === "school_delivered")
    ).length;
    const bin = enrollmentData.filter((e) =>
      e.distributions.some((d) => d.status === "binned")
    ).length;
    return { pickup, school, bin, total: enrollmentData.length };
  }, [enrollmentData]);

  // Distribution by school
  const distBySchool = useMemo(() => {
    const map: Record<string, { total: number; pickup: number; school: number; bin: number }> = {};
    for (const e of enrollmentData) {
      if (!map[e.school_name]) {
        map[e.school_name] = { total: 0, pickup: 0, school: 0, bin: 0 };
      }
      map[e.school_name].total++;
      if (e.distributions.some((d) => d.status === "picked_up"))
        map[e.school_name].pickup++;
      if (e.distributions.some((d) => d.status === "school_delivered"))
        map[e.school_name].school++;
      if (e.distributions.some((d) => d.status === "binned"))
        map[e.school_name].bin++;
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [enrollmentData]);

  // Sort grades properly
  const gradeOrder = ["PK", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const sortedByGrade = [...byGrade].sort(
    (a, b) => gradeOrder.indexOf(a[0]) - gradeOrder.indexOf(b[0])
  );

  return (
    <div className="space-y-6">
      {/* Cycle selector + export */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium"
          value={yearId}
          onChange={(e) => changeYear(e.target.value)}
        >
          {programYears.map((py) => (
            <option key={py.id} value={py.id}>
              {py.label} {py.is_active ? "(Active)" : ""}
            </option>
          ))}
        </select>

        <a href={`/api/export?type=enrollments&year=${yearId}`} download>
          <Button variant="outline" size="sm">
            Export Cycle to CSV
          </Button>
        </a>
        <a href="/api/export?type=students" download>
          <Button variant="outline" size="sm">
            Export All Students to CSV
          </Button>
        </a>
      </div>

      <p className="text-sm text-zinc-500">
        {enrollmentData.length} enrollments in this cycle.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Pack Code */}
        <BreakdownCard title="By Pack Code" data={byPackCode} />

        {/* By Grade */}
        <BreakdownCard title="By Grade" data={sortedByGrade} />

        {/* By District */}
        <BreakdownCard title="By School District" data={byDistrict} />

        {/* By Gender */}
        <BreakdownCard title="By Gender" data={byGender} />

        {/* By Ethnicity */}
        <BreakdownCard title="By Ethnicity" data={byEthnicity} />

        {/* Distribution completion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribution Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Pickup</TableCell>
                  <TableCell className="text-right">{distReport.pickup}</TableCell>
                  <TableCell className="text-right">{distReport.total}</TableCell>
                  <TableCell className="text-right">
                    {distReport.total ? Math.round((distReport.pickup / distReport.total) * 100) : 0}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>School Delivery</TableCell>
                  <TableCell className="text-right">{distReport.school}</TableCell>
                  <TableCell className="text-right">{distReport.total}</TableCell>
                  <TableCell className="text-right">
                    {distReport.total ? Math.round((distReport.school / distReport.total) * 100) : 0}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Bin</TableCell>
                  <TableCell className="text-right">{distReport.bin}</TableCell>
                  <TableCell className="text-right">{distReport.total}</TableCell>
                  <TableCell className="text-right">
                    {distReport.total ? Math.round((distReport.bin / distReport.total) * 100) : 0}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Distribution by school */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribution by School</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pickup</TableHead>
                <TableHead className="text-right">School Del.</TableHead>
                <TableHead className="text-right">Bin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distBySchool.map(([school, stats]) => (
                <TableRow key={school}>
                  <TableCell>{school}</TableCell>
                  <TableCell className="text-right">{stats.total}</TableCell>
                  <TableCell className="text-right">{stats.pickup}</TableCell>
                  <TableCell className="text-right">{stats.school}</TableCell>
                  <TableCell className="text-right">{stats.bin}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* By School */}
      <BreakdownCard title="Enrollment by School" data={bySchool} />
    </div>
  );
}

function BreakdownCard({
  title,
  data,
}: {
  title: string;
  data: [string, number][];
}) {
  const total = data.reduce((sum, [, count]) => sum + count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Value</TableHead>
              <TableHead className="text-right">Count</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(([value, count]) => (
              <TableRow key={value}>
                <TableCell>{value || "(empty)"}</TableCell>
                <TableCell className="text-right">{count}</TableCell>
                <TableCell className="text-right">
                  {total ? Math.round((count / total) * 100) : 0}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-medium">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{total}</TableCell>
              <TableCell className="text-right">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function countBy<T>(arr: T[], fn: (item: T) => string): [string, number][] {
  const counts: Record<string, number> = {};
  for (const item of arr) {
    const key = fn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}
