"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmDuplicate, dismissDuplicate } from "./actions";

interface Guardian {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Enrollment {
  grade: string;
  school_name: string;
  pack_code: string;
  cycle_id: string;
  cycles: { season: string; program_years: { label: string } | null } | null;
}

interface Student {
  id: string;
  refresh_id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  school_student_id: string | null;
  notes: string | null;
  created_at: string;
  guardians: Guardian[];
  enrollments: Enrollment[];
}

interface DuplicateItem {
  student: Student;
  matches: Student[];
}

const SEASON_LABELS: Record<string, string> = {
  aug: "Aug",
  nov: "Nov",
  feb: "Feb",
  may: "May",
};

export function DuplicateQueue({ items }: { items: DuplicateItem[] }) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  async function handleConfirm(duplicateId: string, canonicalId: string) {
    setProcessing(duplicateId);
    const result = await confirmDuplicate(duplicateId, canonicalId);
    if (result.success) {
      setConfirmed((prev) => new Set(prev).add(duplicateId));
    }
    setProcessing(null);
  }

  async function handleDismiss(studentId: string) {
    setProcessing(studentId);
    const result = await dismissDuplicate(studentId);
    if (result.success) {
      setDismissed((prev) => new Set(prev).add(studentId));
    }
    setProcessing(null);
  }

  const visible = items.filter(
    (item) => !dismissed.has(item.student.id) && !confirmed.has(item.student.id)
  );

  if (visible.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-lg text-zinc-500">No duplicates to review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {visible.map((item) => (
        <Card key={item.student.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Flagged Record
                {item.student.notes && (
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    — {item.student.notes}
                  </span>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDismiss(item.student.id)}
                disabled={processing === item.student.id}
              >
                {processing === item.student.id ? "..." : "Not a Duplicate"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Flagged record */}
              <StudentCard
                student={item.student}
                label="New Record"
                highlight
              />

              {/* Potential matches */}
              {item.matches.length > 0 ? (
                item.matches.map((match) => (
                  <div key={match.id} className="space-y-2">
                    <StudentCard
                      student={match}
                      label="Existing Record"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        handleConfirm(item.student.id, match.id)
                      }
                      disabled={processing === item.student.id}
                    >
                      {processing === item.student.id
                        ? "Processing..."
                        : `Confirm Duplicate of #${match.refresh_id}`}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center rounded-md border border-dashed border-zinc-300 p-8">
                  <p className="text-sm text-zinc-500">
                    No matching records found automatically.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StudentCard({
  student,
  label,
  highlight,
}: {
  student: Student;
  label: string;
  highlight?: boolean;
}) {
  const guardian = student.guardians?.[0];
  const latestEnrollment = student.enrollments?.[student.enrollments.length - 1];

  return (
    <div
      className={`rounded-md border p-4 ${
        highlight ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <Badge variant={highlight ? "outline" : "secondary"} className="text-xs">
          {label}
        </Badge>
        <span className="font-mono text-xs text-zinc-400">
          #{student.refresh_id}
        </span>
      </div>

      <h3 className="text-lg font-semibold">
        <Link
          href={`/admin/students/${student.id}`}
          className="hover:underline"
        >
          {student.first_name} {student.last_name}
        </Link>
      </h3>

      <dl className="mt-2 space-y-1 text-sm">
        <Row label="DOB" value={student.date_of_birth} />
        <Row label="Gender" value={student.gender} />
        <Row
          label="Student ID"
          value={student.school_student_id ?? "N/A"}
        />
        {latestEnrollment && (
          <>
            <Row label="Grade" value={latestEnrollment.grade} />
            <Row label="School" value={latestEnrollment.school_name} />
            <Row label="Pack Code" value={latestEnrollment.pack_code} />
            {latestEnrollment.cycles && (
              <Row
                label="Cycle"
                value={`${latestEnrollment.cycles.program_years?.label ?? ""} ${
                  SEASON_LABELS[latestEnrollment.cycles.season] ?? latestEnrollment.cycles.season
                }`}
              />
            )}
          </>
        )}
        {guardian && (
          <Row
            label="Guardian"
            value={`${guardian.first_name} ${guardian.last_name} — ${guardian.email}`}
          />
        )}
        <Row
          label="Registered"
          value={new Date(student.created_at).toLocaleDateString()}
        />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className="truncate text-right text-zinc-900">{value}</dd>
    </div>
  );
}
