"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DISTRICTS } from "@/lib/schemas/registration";

interface Enrollment {
  id: string;
  pack_code: string;
  grade: string;
  school_district: string;
  school_name: string;
  program_year_id: string;
}

interface Guardian {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Student {
  id: string;
  refresh_id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  is_unenrolled: boolean;
  is_duplicate: boolean;
  school_student_id: string | null;
  created_at: string;
  guardians: Guardian[];
  enrollments: Enrollment[];
}

interface ProgramYear {
  id: string;
  label: string;
}

interface Props {
  students: Student[];
  programYears: ProgramYear[];
  initialSearch: string;
  initialDistrict: string;
  initialPackCode: string;
  initialUnenrolled: string;
  initialDuplicate: string;
  initialYear: string;
}

const SEASON_LABELS: Record<string, string> = {
  aug: "August",
  nov: "November",
  feb: "February",
  may: "May",
};

export function StudentList({
  students,
  programYears,
  initialSearch,
  initialDistrict,
  initialPackCode,
  initialUnenrolled,
  initialDuplicate,
  initialYear,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [district, setDistrict] = useState(initialDistrict);
  const [packCode, setPackCode] = useState(initialPackCode);
  const [unenrolled, setUnenrolled] = useState(initialUnenrolled);
  const [duplicate, setDuplicate] = useState(initialDuplicate);
  const [year, setYear] = useState(initialYear);

  function applyFilters(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams();
    const values = {
      q: search,
      district,
      pack_code: packCode,
      unenrolled,
      duplicate,
      year,
      ...overrides,
    };
    Object.entries(values).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") applyFilters();
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name, ID, school, pack code, grade..."
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onBlur={() => applyFilters()}
        />
        <select
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            applyFilters({ district: e.target.value });
          }}
        >
          <option value="">All Districts</option>
          {DISTRICTS.filter((d) => d !== "Other").map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <Input
          placeholder="Pack code"
          className="w-24"
          value={packCode}
          onChange={(e) => setPackCode(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onBlur={() => applyFilters()}
        />
        <select
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          value={year}
          onChange={(e) => {
            setYear(e.target.value);
            applyFilters({ year: e.target.value });
          }}
        >
          <option value="">All Years</option>
          {programYears.map((py) => (
            <option key={py.id} value={py.id}>
              {py.label}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          value={unenrolled}
          onChange={(e) => {
            setUnenrolled(e.target.value);
            applyFilters({ unenrolled: e.target.value });
          }}
        >
          <option value="">All Status</option>
          <option value="false">Active</option>
          <option value="true">Unenrolled</option>
        </select>
        <select
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          value={duplicate}
          onChange={(e) => {
            setDuplicate(e.target.value);
            applyFilters({ duplicate: e.target.value });
          }}
        >
          <option value="">All</option>
          <option value="true">Duplicates Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Refresh ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead className="hidden md:table-cell">School</TableHead>
              <TableHead>Pack Code</TableHead>
              <TableHead className="hidden lg:table-cell">Guardian</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => {
                const latestEnrollment = s.enrollments?.[s.enrollments.length - 1];
                const primaryGuardian = s.guardians?.[0];
                return (
                  <TableRow
                    key={s.id}
                    className={`cursor-pointer hover:bg-zinc-50 ${isPending ? "opacity-50" : ""}`}
                  >
                    <TableCell>
                      <Link
                        href={`/admin/students/${s.id}`}
                        className="font-mono font-medium text-zinc-900"
                      >
                        {s.refresh_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/students/${s.id}`} className="font-medium">
                        {s.first_name} {s.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>{latestEnrollment?.grade ?? "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {latestEnrollment?.school_name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {latestEnrollment?.pack_code ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-zinc-500">
                      {primaryGuardian
                        ? `${primaryGuardian.first_name} ${primaryGuardian.last_name}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {s.is_unenrolled && (
                          <Badge variant="destructive" className="text-xs">
                            Unenrolled
                          </Badge>
                        )}
                        {s.is_duplicate && (
                          <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                            Duplicate
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
