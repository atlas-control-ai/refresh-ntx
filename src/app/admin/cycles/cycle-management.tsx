"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createProgramYear,
  setActiveYear,
  toggleRegistrationOpen,
  updateDistributionDate,
} from "./actions";

interface Cycle {
  id: string;
  season: string;
  distribution_date: string | null;
  is_open: boolean;
  created_at: string;
}

interface ProgramYear {
  id: string;
  label: string;
  is_active: boolean;
  is_registration_open: boolean;
  created_at: string;
  cycles: Cycle[];
}

const SEASON_LABELS: Record<string, string> = {
  aug: "August",
  nov: "November",
  feb: "February",
  may: "May",
};

const SEASON_ORDER = ["aug", "nov", "feb", "may"];

export function CycleManagement({
  programYears,
  enrollmentCounts,
}: {
  programYears: ProgramYear[];
  enrollmentCounts: Record<string, number>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newLabel.trim()) return;
    setCreating(true);
    setError(null);
    const result = await createProgramYear(newLabel.trim());
    if (result.error) setError(result.error);
    else { setNewLabel(""); setShowCreate(false); }
    setCreating(false);
  }

  async function handleSetActive(yearId: string) {
    setProcessing(`active-${yearId}`);
    await setActiveYear(yearId);
    setProcessing(null);
  }

  async function handleToggleRegistration(yearId: string, currentlyOpen: boolean) {
    setProcessing(`reg-${yearId}`);
    await toggleRegistrationOpen(yearId, !currentlyOpen);
    setProcessing(null);
  }

  async function handleDateChange(cycleId: string, date: string) {
    setProcessing(`date-${cycleId}`);
    await updateDistributionDate(cycleId, date || null);
    setProcessing(null);
  }

  return (
    <div className="space-y-6">
      {showCreate ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label>Program Year Label</Label>
                <Input placeholder="e.g. 2026-2027" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
              </div>
              <Button onClick={handleCreate} disabled={creating || !newLabel.trim()}>
                {creating ? "Creating..." : "Create Year"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <p className="mt-2 text-xs text-zinc-500">Creates the program year with four distribution events (Aug, Nov, Feb, May).</p>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowCreate(true)}>New Program Year</Button>
      )}

      {programYears.map((year) => {
        const sortedCycles = [...year.cycles].sort(
          (a, b) => SEASON_ORDER.indexOf(a.season) - SEASON_ORDER.indexOf(b.season)
        );
        // Sum enrollments across all cycles for this year (legacy) — use program year count
        const yearEnrolled = enrollmentCounts[year.id] ?? 0;

        return (
          <Card key={year.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle>{year.label}</CardTitle>
                  {year.is_active ? (
                    <Badge className="bg-green-600 text-white">Active</Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleSetActive(year.id)} disabled={processing === `active-${year.id}`}>
                      {processing === `active-${year.id}` ? "..." : "Set as Active"}
                    </Button>
                  )}
                  {year.is_registration_open && (
                    <Badge variant="outline" className="border-blue-400 text-blue-700">Registration Open</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-500">{yearEnrolled} enrolled</span>
                  <Button
                    variant={year.is_registration_open ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleRegistration(year.id, year.is_registration_open)}
                    disabled={processing === `reg-${year.id}`}
                  >
                    {processing === `reg-${year.id}`
                      ? "..."
                      : year.is_registration_open
                      ? "Close Registration"
                      : "Open Registration"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-zinc-500">Distribution Events</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {sortedCycles.map((cycle) => (
                  <div key={cycle.id} className="rounded-lg border border-zinc-200 p-4">
                    <h3 className="font-semibold text-zinc-900">
                      {SEASON_LABELS[cycle.season] ?? cycle.season}
                    </h3>
                    <div className="mt-3">
                      <Label className="text-xs">Distribution Date</Label>
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        value={cycle.distribution_date ?? ""}
                        onChange={(e) => handleDateChange(cycle.id, e.target.value)}
                        disabled={processing === `date-${cycle.id}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
