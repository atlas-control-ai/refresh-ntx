"use client";

import { useState, useTransition, useMemo } from "react";
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
  student_id: string;
  students: {
    id: string;
    refresh_id: number;
    first_name: string;
    last_name: string;
  };
  distributions: Distribution[];
}

interface Cycle {
  id: string;
  season: string;
  distribution_date: string | null;
  is_open: boolean;
  program_years: { label: string } | null;
}

const SEASON_LABELS: Record<string, string> = {
  aug: "August",
  nov: "November",
  feb: "February",
  may: "May",
};

interface Props {
  enrollments: Enrollment[];
  cycles: Cycle[];
  selectedCycleId: string;
  isAdmin: boolean;
  search: string;
  methodFilter: string;
}

export function DistributionView({
  enrollments,
  cycles,
  selectedCycleId,
  isAdmin,
  search: initialSearch,
  methodFilter: initialMethod,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [method, setMethod] = useState(initialMethod);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function navigate(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams();
    const values = { cycle: selectedCycleId, q: search, method, ...overrides };
    Object.entries(values).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
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

    if (method) {
      list = list.filter((e) => {
        const dist = e.distributions.find((d) => d.method === method);
        return dist ? !dist.completed : true; // Show those NOT yet completed for this method
      });
    }

    return list;
  }, [enrollments, search, method]);

  // Stats
  const stats = useMemo(() => {
    const total = enrollments.length;
    const pickup = enrollments.filter((e) =>
      e.distributions.some((d) => d.method === "pickup" && d.completed)
    ).length;
    const schoolDel = enrollments.filter((e) =>
      e.distributions.some((d) => d.method === "school_delivery" && d.completed)
    ).length;
    const bin = enrollments.filter((e) =>
      e.distributions.some((d) => d.method === "bin" && d.completed)
    ).length;
    return { total, pickup, schoolDel, bin };
  }, [enrollments]);

  async function handleToggle(
    enrollmentId: string,
    distMethod: "pickup" | "school_delivery" | "bin",
    currentlyCompleted: boolean
  ) {
    setUpdatingId(`${enrollmentId}-${distMethod}`);
    await markDistribution(enrollmentId, distMethod, !currentlyCompleted);
    setUpdatingId(null);
  }

  function getDist(e: Enrollment, m: string): Distribution | undefined {
    return e.distributions.find((d) => d.method === m);
  }

  return (
    <div className="space-y-4">
      {/* Cycle selector + stats */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium"
          value={selectedCycleId}
          onChange={(e) => navigate({ cycle: e.target.value, q: "", method: "" })}
        >
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.program_years?.label} {SEASON_LABELS[c.season] ?? c.season}
              {c.is_open ? " (Open)" : ""}
            </option>
          ))}
        </select>

        <div className="flex gap-4 text-sm text-zinc-500">
          <span>Total: <strong className="text-zinc-900">{stats.total}</strong></span>
          <span>Pickup: <strong className="text-green-700">{stats.pickup}</strong></span>
          <span>School: <strong className="text-blue-700">{stats.schoolDel}</strong></span>
          <span>Bin: <strong className="text-amber-700">{stats.bin}</strong></span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name, Refresh ID, school..."
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="">All Methods</option>
          <option value="pickup">Pickup (not completed)</option>
          <option value="school_delivery">School Delivery (not completed)</option>
          <option value="bin">Bin (not completed)</option>
        </select>
      </div>

      {/* Table */}
      <div className={`rounded-md border bg-white ${isPending ? "opacity-50" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Refresh ID</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="hidden md:table-cell">School</TableHead>
              <TableHead>Pack</TableHead>
              <TableHead className="text-center">Pickup</TableHead>
              <TableHead className="text-center">School Delivery</TableHead>
              <TableHead className="text-center">Bin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                  No enrollments found for this cycle.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => {
                const pickup = getDist(e, "pickup");
                const schoolDel = getDist(e, "school_delivery");
                const bin = getDist(e, "bin");

                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-sm">
                      <Link
                        href={`/admin/students/${e.students.id}`}
                        className="text-zinc-900 hover:underline"
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
                      {e.school_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{e.pack_code}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DistButton
                        completed={pickup?.completed ?? false}
                        loading={updatingId === `${e.id}-pickup`}
                        onClick={() =>
                          handleToggle(e.id, "pickup", pickup?.completed ?? false)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <DistButton
                        completed={schoolDel?.completed ?? false}
                        loading={updatingId === `${e.id}-school_delivery`}
                        onClick={() =>
                          handleToggle(
                            e.id,
                            "school_delivery",
                            schoolDel?.completed ?? false
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <DistButton
                        completed={bin?.completed ?? false}
                        loading={updatingId === `${e.id}-bin`}
                        onClick={() =>
                          handleToggle(e.id, "bin", bin?.completed ?? false)
                        }
                      />
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

function DistButton({
  completed,
  loading,
  onClick,
}: {
  completed: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={completed ? "default" : "outline"}
      size="sm"
      className={`h-8 w-8 p-0 ${
        completed
          ? "bg-green-600 hover:bg-green-700 text-white"
          : "hover:bg-zinc-100"
      }`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? "..." : completed ? "\u2713" : ""}
    </Button>
  );
}
