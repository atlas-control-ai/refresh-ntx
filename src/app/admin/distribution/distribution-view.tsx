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
import { markDistribution } from "./actions";

interface Distribution {
  id: string;
  season: string;
  method: string;
  completed: boolean;
  completed_at: string | null;
}

interface Enrollment {
  id: string;
  pack_code: string;
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

const SEASONS = ["aug", "nov", "feb", "may"] as const;
const SEASON_LABELS: Record<string, string> = {
  aug: "Aug",
  nov: "Nov",
  feb: "Feb",
  may: "May",
};

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

  // Stats per season
  const stats = useMemo(() => {
    const s: Record<string, { pickup: number; school: number; bin: number }> = {};
    for (const season of SEASONS) {
      s[season] = { pickup: 0, school: 0, bin: 0 };
    }
    for (const e of enrollments) {
      for (const d of e.distributions) {
        if (d.completed && s[d.season]) {
          if (d.method === "pickup") s[d.season].pickup++;
          else if (d.method === "school_delivery") s[d.season].school++;
          else if (d.method === "bin") s[d.season].bin++;
        }
      }
    }
    return s;
  }, [enrollments]);

  async function handleToggle(
    enrollmentId: string,
    season: "aug" | "nov" | "feb" | "may",
    method: "pickup" | "school_delivery" | "bin",
    currentlyCompleted: boolean
  ) {
    const key = `${enrollmentId}-${season}-${method}`;
    setUpdatingId(key);
    await markDistribution(enrollmentId, season, method, !currentlyCompleted);
    setUpdatingId(null);
  }

  function getDist(e: Enrollment, season: string, method: string): Distribution | undefined {
    return e.distributions.find((d) => d.season === season && d.method === method);
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
        {SEASONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSeasonFilter(seasonFilter === s ? "" : s);
            }}
            className={`rounded-md border p-3 text-center transition-colors ${
              seasonFilter === s ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            <p className="text-xs font-medium uppercase">{SEASON_LABELS[s]}</p>
            <p className="text-xs text-zinc-500 mt-0.5" style={seasonFilter === s ? { color: "rgba(255,255,255,0.7)" } : {}}>
              {distDates[s] ? new Date(distDates[s] + "T12:00:00").toLocaleDateString() : "No date"}
            </p>
            <div className="mt-1 flex justify-center gap-2 text-xs">
              <span title="Pickup">P:{stats[s]?.pickup ?? 0}</span>
              <span title="School">S:{stats[s]?.school ?? 0}</span>
              <span title="Bin">B:{stats[s]?.bin ?? 0}</span>
            </div>
          </button>
        ))}
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
                <TableHead key={s} colSpan={3} className="text-center border-l">
                  {SEASON_LABELS[s]}
                  <div className="flex text-xs font-normal text-zinc-400 justify-center gap-2">
                    <span>P</span><span>S</span><span>B</span>
                  </div>
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
                    <Badge variant="secondary">{e.pack_code}</Badge>
                  </TableCell>
                  {(activeSeason ? [activeSeason] : SEASONS).map((s) => {
                    const season = s as "aug" | "nov" | "feb" | "may";
                    return ["pickup", "school_delivery", "bin"].map((m) => {
                      const dist = getDist(e, s, m);
                      const key = `${e.id}-${s}-${m}`;
                      return (
                        <TableCell key={key} className="text-center px-1 border-l-0">
                          <DistBtn
                            completed={dist?.completed ?? false}
                            loading={updatingId === key}
                            onClick={() => handleToggle(e.id, season, m as "pickup" | "school_delivery" | "bin", dist?.completed ?? false)}
                          />
                        </TableCell>
                      );
                    });
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

function DistBtn({ completed, loading, onClick }: { completed: boolean; loading: boolean; onClick: () => void }) {
  return (
    <button
      className={`h-6 w-6 rounded text-xs font-bold transition-colors ${
        completed
          ? "bg-green-600 text-white"
          : "border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-300"
      }`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? "·" : completed ? "✓" : ""}
    </button>
  );
}
