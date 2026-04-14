"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { updateDistributionStatus } from "./actions";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  isDistributionCompleted,
  effectivePackCode,
  SEASONS,
  SEASON_SHORT,
} from "@/lib/types";
import type { DistributionStatus } from "@/lib/types";

interface Distribution {
  id: string;
  season: string;
  status: string;
  completed_at: string | null;
  notes: string | null;
}

interface Enrollment {
  id: string;
  pack_code_calculated: string;
  pack_code_override: string | null;
  grade: string;
  school_district: string;
  school_name: string;
  students: {
    id: string;
    refresh_id: number;
    first_name: string;
    last_name: string;
  };
  distributions: Distribution[];
}

interface ProgramYear {
  id: string;
  label: string;
  is_active: boolean;
}

const ALL_STATUSES: DistributionStatus[] = [
  "pending",
  "picked_up",
  "school_delivered",
  "binned",
  "not_fulfilled",
  "exception",
];

interface Props {
  enrollments: Enrollment[];
  programYears: ProgramYear[];
  selectedYearId: string;
  distDates: Record<string, string | null>;
  isAdmin: boolean;
  search: string;
  seasonFilter: string;
}

export function DistributionView({
  enrollments,
  programYears,
  selectedYearId,
  distDates,
  search: initialSearch,
  seasonFilter: initialSeason,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(initialSearch);
  const [seasonFilter, setSeasonFilter] = useState(initialSeason);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function navigate(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams();
    const values = { year: selectedYearId, q: search, season: seasonFilter, ...overrides };
    Object.entries(values).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  const filtered = useMemo(() => {
    let list = enrollments;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => {
        const name = `${e.students.first_name} ${e.students.last_name}`.toLowerCase();
        return (
          name.includes(q) ||
          e.students.refresh_id.toString().includes(q) ||
          e.school_name.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [enrollments, search]);

  // Stats per season — count by status
  const stats = useMemo(() => {
    const s: Record<string, Record<string, number>> = {};
    for (const season of SEASONS) {
      s[season] = {};
      for (const st of ALL_STATUSES) {
        s[season][st] = 0;
      }
    }
    for (const e of enrollments) {
      for (const d of e.distributions) {
        if (s[d.season]) {
          s[d.season][d.status] = (s[d.season][d.status] ?? 0) + 1;
        }
      }
    }
    return s;
  }, [enrollments]);

  function getDist(e: Enrollment, season: string): Distribution | undefined {
    return e.distributions.find((d) => d.season === season);
  }

  async function handleStatusChange(distId: string, newStatus: DistributionStatus) {
    setUpdatingId(distId);
    await updateDistributionStatus(distId, newStatus);
    setUpdatingId(null);
  }

  const activeSeason = seasonFilter || null;

  return (
    <div className="space-y-4">
      {/* Year selector + stats */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium"
          value={selectedYearId}
          onChange={(e) => navigate({ year: e.target.value, q: "", season: "" })}
        >
          {programYears.map((py) => (
            <option key={py.id} value={py.id}>
              {py.label} {py.is_active ? "(Active)" : ""}
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-500">
          {enrollments.length} enrolled
        </span>
      </div>

      {/* Season stats row */}
      <div className="grid grid-cols-4 gap-3">
        {SEASONS.map((s) => {
          const completed = (stats[s]?.picked_up ?? 0) + (stats[s]?.school_delivered ?? 0) + (stats[s]?.binned ?? 0);
          const total = enrollments.length;
          return (
            <button
              key={s}
              onClick={() => {
                setSeasonFilter(seasonFilter === s ? "" : s);
              }}
              className={`rounded-md border p-3 text-center transition-colors ${
                seasonFilter === s ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              <p className="text-xs font-medium uppercase">{SEASON_SHORT[s]}</p>
              <p className="text-xs text-zinc-500 mt-0.5" style={seasonFilter === s ? { color: "rgba(255,255,255,0.7)" } : {}}>
                {distDates[s] ? new Date(distDates[s] + "T12:00:00").toLocaleDateString() : "No date"}
              </p>
              <div className="mt-1 text-xs">
                <span title="Completed">{completed}/{total}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <Input
        placeholder="Search name, Refresh ID, school..."
        className="max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="hidden lg:table-cell">School</TableHead>
              <TableHead className="w-16">Pack</TableHead>
              {(activeSeason ? [activeSeason] : SEASONS).map((s) => (
                <TableHead key={s} className="text-center border-l">
                  {SEASON_SHORT[s]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={20} className="h-24 text-center text-zinc-500">
                  No enrollments found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => (
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
                  <TableCell className="hidden lg:table-cell text-sm text-zinc-500">
                    {e.school_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{effectivePackCode(e)}</Badge>
                  </TableCell>
                  {(activeSeason ? [activeSeason] : SEASONS).map((s) => {
                    const dist = getDist(e, s);
                    return (
                      <TableCell key={s} className="text-center px-1 border-l">
                        {dist ? (
                          <StatusDropdown
                            dist={dist}
                            loading={updatingId === dist.id}
                            onStatusChange={(status) => handleStatusChange(dist.id, status)}
                          />
                        ) : (
                          <span className="text-xs text-zinc-300">--</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatusDropdown({
  dist,
  loading,
  onStatusChange,
}: {
  dist: Distribution;
  loading: boolean;
  onStatusChange: (status: DistributionStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  if (loading) {
    return <span className="text-xs text-zinc-400">...</span>;
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[dist.status] ?? "bg-zinc-100 text-zinc-600"}`}
      >
        {STATUS_LABELS[dist.status] ?? dist.status}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 right-0 w-36 rounded-md border bg-white shadow-lg py-1">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 ${
                  s === dist.status ? "font-semibold" : ""
                }`}
                onClick={() => {
                  onStatusChange(s);
                  setOpen(false);
                }}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[s]?.split(" ")[0] ?? "bg-zinc-100"}`} />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
