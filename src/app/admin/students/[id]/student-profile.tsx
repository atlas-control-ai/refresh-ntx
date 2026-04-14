"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateStudent, unenrollStudent, reenrollStudent,
  verifyStudentId, setPackCodeOverride,
} from "./actions";
import { ETHNICITIES } from "@/lib/schemas/registration";
import {
  effectivePackCode, trustLevelLabel, trustLevelColor,
  isDistributionCompleted, STATUS_LABELS, STATUS_COLORS,
  SEASONS, SEASON_SHORT,
} from "@/lib/types";

interface Distribution {
  id: string;
  season: string;
  status: string;
  completed_at: string | null;
}

interface Enrollment {
  id: string;
  pack_code_calculated: string;
  pack_code_override: string | null;
  pack_code_override_reason: string | null;
  grade: string;
  school_district: string;
  school_name: string;
  menstruation_preference: string | null;
  submitted_at: string;
  program_years: { label: string } | null;
  distributions: Distribution[];
}

interface Guardian {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  zip_code: string;
  county: string;
  is_primary: boolean;
}

interface Sibling {
  id: string;
  refresh_id: number;
  first_name: string;
  last_name: string;
}

interface Student {
  id: string;
  refresh_id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  school_student_id: string | null;
  student_id_trust_level: number;
  student_id_verified_by: string | null;
  ethnicity: string[];
  ethnic_hair_preference: boolean;
  notes: string | null;
  is_unenrolled: boolean;
  is_duplicate: boolean;
  household_id: string | null;
  households: { id: string; primary_email: string; primary_phone: string | null } | null;
  created_at: string;
  guardians: Guardian[];
  enrollments: Enrollment[];
}

export function StudentProfile({
  student, siblings, isAdmin, currentUserEmail,
}: {
  student: Student;
  siblings: Sibling[];
  isAdmin: boolean;
  currentUserEmail: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUnenrollConfirm, setShowUnenrollConfirm] = useState(false);
  const [packOverrideEnrollmentId, setPackOverrideEnrollmentId] = useState<string | null>(null);
  const [packOverrideValue, setPackOverrideValue] = useState("");
  const [packOverrideReason, setPackOverrideReason] = useState("");

  const [firstName, setFirstName] = useState(student.first_name);
  const [lastName, setLastName] = useState(student.last_name);
  const [dateOfBirth, setDateOfBirth] = useState(student.date_of_birth);
  const [gender, setGender] = useState(student.gender);
  const [schoolStudentId, setSchoolStudentId] = useState(student.school_student_id ?? "");
  const [ethnicity, setEthnicity] = useState<string[]>(student.ethnicity);
  const [ethnicHair, setEthnicHair] = useState(student.ethnic_hair_preference);
  const [notes, setNotes] = useState(student.notes ?? "");

  async function handleSave() {
    setSaving(true);
    await updateStudent(student.id, {
      first_name: firstName, last_name: lastName, date_of_birth: dateOfBirth,
      gender, school_student_id: schoolStudentId || null, ethnicity,
      ethnic_hair_preference: ethnicHair, notes: notes || null,
    });
    setSaving(false);
    setEditing(false);
  }

  async function handleUnenroll() {
    setSaving(true);
    await unenrollStudent(student.id);
    setSaving(false);
    setShowUnenrollConfirm(false);
  }

  async function handleVerifyId() {
    setSaving(true);
    await verifyStudentId(student.id, currentUserEmail);
    setSaving(false);
  }

  async function handlePackOverride() {
    if (!packOverrideEnrollmentId) return;
    setSaving(true);
    await setPackCodeOverride(
      packOverrideEnrollmentId,
      packOverrideValue || null,
      packOverrideReason || null,
    );
    setPackOverrideEnrollmentId(null);
    setPackOverrideValue("");
    setPackOverrideReason("");
    setSaving(false);
  }

  function toggleEthnicity(value: string) {
    setEthnicity((prev) => prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]);
  }

  const primaryGuardian = student.guardians?.find((g) => g.is_primary) ?? student.guardians?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/students" className="text-sm text-zinc-500 hover:text-zinc-700">&larr; Students</Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">{student.first_name} {student.last_name}</h1>
          <p className="text-sm text-zinc-500">Refresh ID: <span className="font-mono font-medium">{student.refresh_id}</span></p>
          <div className="mt-1 flex gap-2">
            {student.is_unenrolled && <Badge variant="destructive">Unenrolled</Badge>}
            {student.is_duplicate && <Badge variant="outline" className="border-amber-400 text-amber-700">Possible Duplicate</Badge>}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                {student.is_unenrolled ? (
                  <Button variant="outline" size="sm" onClick={async () => { setSaving(true); await reenrollStudent(student.id); setSaving(false); }} disabled={saving}>Re-enroll</Button>
                ) : (
                  <Button variant="destructive" size="sm" onClick={() => setShowUnenrollConfirm(true)}>Unenroll</Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showUnenrollConfirm && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Are you sure you want to unenroll {student.first_name}?</p>
          <div className="mt-3 flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleUnenroll} disabled={saving}>{saving ? "..." : "Yes, Unenroll"}</Button>
            <Button variant="outline" size="sm" onClick={() => setShowUnenrollConfirm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Student Info */}
        <Card>
          <CardHeader><CardTitle>Student Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>First Name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                  <div><Label>Last Name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Date of Birth</Label><Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} /></div>
                  <div><Label>Gender</Label>
                    <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm" value={gender} onChange={(e) => setGender(e.target.value)}>
                      {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Student ID {student.student_id_trust_level === 3 && <span className="text-xs text-amber-600">(verified — editing will reset verification)</span>}</Label>
                  <Input value={schoolStudentId} onChange={(e) => setSchoolStudentId(e.target.value)} placeholder="Optional" />
                </div>
                <div><Label>Ethnicity</Label>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {ETHNICITIES.map((eth) => (
                      <label key={eth} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={ethnicity.includes(eth)} onCheckedChange={() => toggleEthnicity(eth)} />{eth}
                      </label>
                    ))}
                  </div>
                </div>
                <div><Label>Extra moisturizing products</Label>
                  <div className="mt-1 flex gap-4">
                    {[{ label: "Yes", value: true }, { label: "No", value: false }].map((opt) => (
                      <label key={String(opt.value)} className="flex items-center gap-2 text-sm">
                        <input type="radio" checked={ethnicHair === opt.value} onChange={() => setEthnicHair(opt.value)} className="accent-zinc-900" />{opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
              </>
            ) : (
              <dl className="space-y-3 text-sm">
                <InfoRow label="Date of Birth" value={student.date_of_birth} />
                <InfoRow label="Gender" value={student.gender} />
                <div className="flex justify-between items-center">
                  <dt className="text-zinc-500">Student ID</dt>
                  <dd className="flex items-center gap-2">
                    <span className="text-zinc-900">{student.school_student_id ?? "N/A"}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${trustLevelColor(student.student_id_trust_level)}`}>
                      {trustLevelLabel(student.student_id_trust_level)}
                    </span>
                    {isAdmin && student.school_student_id && student.student_id_trust_level < 3 && (
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleVerifyId} disabled={saving}>Verify</Button>
                    )}
                  </dd>
                </div>
                <InfoRow label="Ethnicity" value={student.ethnicity.join(", ")} />
                <InfoRow label="Extra Moisturizing" value={student.ethnic_hair_preference ? "Yes" : "No"} />
                {student.notes && <InfoRow label="Notes" value={student.notes} />}
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Guardian + Household */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Guardian Contact</CardTitle></CardHeader>
            <CardContent>
              {primaryGuardian ? (
                <dl className="space-y-3 text-sm">
                  <InfoRow label="Name" value={`${primaryGuardian.first_name} ${primaryGuardian.last_name}`} />
                  <InfoRow label="Email" value={primaryGuardian.email} />
                  <InfoRow label="Phone" value={primaryGuardian.phone} />
                  <InfoRow label="Zip Code" value={primaryGuardian.zip_code} />
                  <InfoRow label="County" value={primaryGuardian.county} />
                </dl>
              ) : (
                <p className="text-sm text-zinc-500">No guardian on file.</p>
              )}
            </CardContent>
          </Card>

          {/* Household / Siblings */}
          <Card>
            <CardHeader><CardTitle>Household</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <InfoRow label="Email" value={student.households?.primary_email ?? "N/A"} />
                {student.households?.primary_phone && <InfoRow label="Phone" value={student.households.primary_phone} />}
              </dl>
              {siblings.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-zinc-500 mb-2">Siblings in this household</p>
                  <div className="flex flex-wrap gap-2">
                    {siblings.map((s) => (
                      <Link key={s.id} href={`/admin/students/${s.id}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm hover:bg-zinc-50">
                        {s.first_name} {s.last_name}
                        <span className="text-xs text-zinc-400">#{s.refresh_id}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enrollment History */}
      <Card>
        <CardHeader><CardTitle>Enrollment History</CardTitle></CardHeader>
        <CardContent>
          {student.enrollments.length === 0 ? (
            <p className="text-sm text-zinc-500">No enrollments.</p>
          ) : (
            student.enrollments.map((e) => {
              const packCode = effectivePackCode(e);
              return (
                <div key={e.id} className="mb-6 last:mb-0">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h3 className="font-medium">{e.program_years?.label ?? "Unknown"}</h3>
                    <Badge variant="secondary">{packCode}</Badge>
                    {e.pack_code_override && (
                      <span className="text-xs text-zinc-500">
                        (override: {e.pack_code_override}, calc: {e.pack_code_calculated})
                      </span>
                    )}
                    {isAdmin && (
                      <Button
                        variant="outline" size="sm" className="h-6 text-xs"
                        onClick={() => {
                          setPackOverrideEnrollmentId(e.id);
                          setPackOverrideValue(e.pack_code_override ?? "");
                          setPackOverrideReason(e.pack_code_override_reason ?? "");
                        }}
                      >
                        Override Pack Code
                      </Button>
                    )}
                    <span className="text-sm text-zinc-500">Grade {e.grade} — {e.school_name}</span>
                  </div>

                  {/* Pack code override inline form */}
                  {packOverrideEnrollmentId === e.id && (
                    <div className="mb-3 flex items-end gap-2 rounded-md border bg-zinc-50 p-3">
                      <div>
                        <Label className="text-xs">Override Code</Label>
                        <Input className="h-8 w-20" value={packOverrideValue} onChange={(ev) => setPackOverrideValue(ev.target.value)} placeholder="e.g. 3P" />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Reason</Label>
                        <Input className="h-8" value={packOverrideReason} onChange={(ev) => setPackOverrideReason(ev.target.value)} placeholder="Why override?" />
                      </div>
                      <Button size="sm" className="h-8" onClick={handlePackOverride} disabled={saving}>{saving ? "..." : "Save"}</Button>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setPackOverrideEnrollmentId(null)}>Cancel</Button>
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Distribution</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SEASONS.map((s) => {
                        const dist = e.distributions.find((d) => d.season === s);
                        const completed = dist ? isDistributionCompleted(dist.status) : false;
                        return (
                          <TableRow key={s}>
                            <TableCell className="font-medium">{SEASON_SHORT[s]}</TableCell>
                            <TableCell>
                              {dist ? (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[dist.status] ?? ""}`}>
                                  {STATUS_LABELS[dist.status] ?? dist.status}
                                </span>
                              ) : (
                                <span className="text-zinc-300">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-zinc-500">
                              {completed && dist?.completed_at
                                ? new Date(dist.completed_at).toLocaleDateString()
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-900">{value}</dd>
    </div>
  );
}
