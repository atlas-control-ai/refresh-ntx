"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { markPickup } from "@/app/admin/distribution/actions";

interface Enrollment {
  id: string;
  pack_code: string;
  grade: string;
  school_name: string;
  students: {
    id: string;
    refresh_id: number;
    first_name: string;
    last_name: string;
  };
  distributions: Array<{
    id: string;
    method: string;
    completed: boolean;
    completed_at: string | null;
  }>;
}

export function CheckInView({ enrollments }: { enrollments: Enrollment[] }) {
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [justCheckedIn, setJustCheckedIn] = useState<Set<string>>(new Set());

  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase().trim();
    return enrollments
      .filter((e) => {
        const name = `${e.students.first_name} ${e.students.last_name}`.toLowerCase();
        const id = e.students.refresh_id.toString();
        return name.includes(q) || id.includes(q);
      })
      .slice(0, 20);
  }, [search, enrollments]);

  async function handlePickup(enrollmentId: string) {
    setProcessingId(enrollmentId);
    const result = await markPickup(enrollmentId);
    if (result.success) {
      setJustCheckedIn((prev) => new Set(prev).add(enrollmentId));
    }
    setProcessingId(null);
  }

  function isPickedUp(e: Enrollment) {
    return (
      justCheckedIn.has(e.id) ||
      e.distributions.some((d) => d.method === "pickup" && d.completed)
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Type name or Refresh ID..."
        className="text-lg h-12"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      {search.trim() && results.length === 0 && (
        <p className="py-8 text-center text-zinc-500">No students found.</p>
      )}

      <div className="space-y-3">
        {results.map((e) => {
          const pickedUp = isPickedUp(e);
          return (
            <Card
              key={e.id}
              className={pickedUp ? "border-green-300 bg-green-50" : ""}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-lg font-semibold text-zinc-900">
                    {e.students.first_name} {e.students.last_name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                    <span className="font-mono">ID: {e.students.refresh_id}</span>
                    <Badge variant="secondary">{e.pack_code}</Badge>
                    <span>Grade {e.grade}</span>
                    <span className="hidden sm:inline">— {e.school_name}</span>
                  </div>
                </div>
                <div className="ml-4 shrink-0">
                  {pickedUp ? (
                    <Badge className="bg-green-600 text-white px-4 py-1.5 text-sm">
                      Picked Up
                    </Badge>
                  ) : (
                    <Button
                      size="lg"
                      onClick={() => handlePickup(e.id)}
                      disabled={processingId === e.id}
                    >
                      {processingId === e.id ? "..." : "Mark Pickup"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
