"use client";

import { useState, useMemo } from "react";
import { submitRegistration, type RegistrationResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GRADES,
  DISTRICTS,
  ETHNICITIES,
  COUNTIES,
  type RegistrationFormData,
  type ChildFormData,
} from "@/lib/schemas/registration";

interface School {
  id: string;
  district: string;
  name: string;
}

const EMPTY_CHILD: ChildFormData = {
  childFirstName: "",
  childLastName: "",
  schoolStudentId: undefined,
  dateOfBirth: "",
  grade: "",
  gender: "Male" as const,
  ethnicity: [],
  schoolDistrict: "",
  schoolName: "",
  ethnicHairPreference: "false" as const,
  menstruationPreference: undefined,
};

export function RegistrationForm({ schools }: { schools: School[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Guardian state
  const [guardianFirstName, setGuardianFirstName] = useState("");
  const [guardianLastName, setGuardianLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [county, setCounty] = useState("");

  // Children state
  const [children, setChildren] = useState<ChildFormData[]>([{ ...EMPTY_CHILD }]);

  function updateChild(index: number, updates: Partial<ChildFormData>) {
    setChildren((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  }

  function addChild() {
    setChildren((prev) => [...prev, { ...EMPTY_CHILD }]);
  }

  function removeChild(index: number) {
    if (children.length <= 1) return;
    setChildren((prev) => prev.filter((_, i) => i !== index));
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setResult(null);
    setLoading(true);

    const formData: RegistrationFormData = {
      guardianFirstName,
      guardianLastName,
      email,
      phone,
      zipCode,
      county,
      children: children.map((c) => ({
        ...c,
        gender: (c.gender || "Male") as ChildFormData["gender"],
        ethnicHairPreference: (c.ethnicHairPreference || "false") as "true" | "false",
      })),
    };

    const res = await submitRegistration(formData);
    setResult(res);
    setLoading(false);
  }

  if (result?.success) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="pt-8 pb-8">
          <div className="mb-4 text-4xl">&#10003;</div>
          <h2 className="text-xl font-bold text-zinc-900">Registration Complete!</h2>
          <p className="mt-2 text-zinc-600">
            {result.refreshIds?.length === 1
              ? "Your child has been registered."
              : `${result.refreshIds?.length} children have been registered.`}
          </p>
          <div className="mt-4 space-y-1">
            {result.refreshIds?.map((id, i) => (
              <p key={i} className="text-lg font-semibold">
                Refresh ID: <span className="text-zinc-900">{id}</span>
              </p>
            ))}
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            Please save {result.refreshIds?.length === 1 ? "this ID" : "these IDs"} for check-in at distribution events.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {result?.error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{result.error}</div>
      )}

      {/* Guardian Information */}
      <Card>
        <CardHeader><CardTitle>Parent / Guardian Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name" error={errors.guardianFirstName}>
              <Input value={guardianFirstName} onChange={(e) => setGuardianFirstName(e.target.value)} required />
            </Field>
            <Field label="Last Name" error={errors.guardianLastName}>
              <Input value={guardianLastName} onChange={(e) => setGuardianLastName(e.target.value)} required />
            </Field>
          </div>
          <Field label="Email" error={errors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cell Phone Number" error={errors.phone}>
              <Input type="tel" placeholder="(XXX) XXX-XXXX" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} required />
            </Field>
            <Field label="Zip Code" error={errors.zipCode}>
              <Input placeholder="75035" maxLength={5} value={zipCode} onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))} required />
            </Field>
          </div>
          <Field label="County" error={errors.county}>
            <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400" value={county} onChange={(e) => setCounty(e.target.value)} required>
              <option value="">Select county...</option>
              {COUNTIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </Field>
        </CardContent>
      </Card>

      {/* Children */}
      {children.map((child, index) => (
        <ChildCard
          key={index}
          index={index}
          child={child}
          schools={schools}
          totalChildren={children.length}
          onUpdate={(updates) => updateChild(index, updates)}
          onRemove={() => removeChild(index)}
        />
      ))}

      <Button type="button" variant="outline" className="w-full" onClick={addChild}>
        + Add Another Child
      </Button>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading
          ? "Submitting..."
          : children.length === 1
          ? "Register"
          : `Register ${children.length} Children`}
      </Button>
    </form>
  );
}

function ChildCard({
  index,
  child,
  schools,
  totalChildren,
  onUpdate,
  onRemove,
}: {
  index: number;
  child: ChildFormData;
  schools: School[];
  totalChildren: number;
  onUpdate: (updates: Partial<ChildFormData>) => void;
  onRemove: () => void;
}) {
  const gradeNum = useMemo(() => {
    if (child.grade === "PK") return -1;
    if (child.grade === "K") return 0;
    return parseInt(child.grade, 10) || -1;
  }, [child.grade]);

  const showMenstruation = child.gender === "Female" && gradeNum >= 5;

  const filteredSchools = useMemo(() => {
    if (!child.schoolDistrict || child.schoolDistrict === "Other") return [];
    return schools.filter((s) => s.district === child.schoolDistrict);
  }, [child.schoolDistrict, schools]);

  function toggleEthnicity(value: string) {
    const newEth = child.ethnicity.includes(value)
      ? child.ethnicity.filter((e) => e !== value)
      : [...child.ethnicity, value];
    onUpdate({ ethnicity: newEth });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Child {totalChildren > 1 ? `#${index + 1}` : "Information"}</CardTitle>
          {totalChildren > 1 && (
            <Button type="button" variant="outline" size="sm" onClick={onRemove}>Remove</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First Name">
            <Input value={child.childFirstName} onChange={(e) => onUpdate({ childFirstName: e.target.value })} required />
          </Field>
          <Field label="Last Name">
            <Input value={child.childLastName} onChange={(e) => onUpdate({ childLastName: e.target.value })} required />
          </Field>
        </div>
        <Field label="Student ID" optional>
          <Input placeholder="District-assigned ID (optional)" value={child.schoolStudentId ?? ""} onChange={(e) => onUpdate({ schoolStudentId: e.target.value || undefined })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of Birth">
            <Input type="date" value={child.dateOfBirth} onChange={(e) => onUpdate({ dateOfBirth: e.target.value })} required />
          </Field>
          <Field label="Grade">
            <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400" value={child.grade} onChange={(e) => onUpdate({ grade: e.target.value })} required>
              <option value="">Select grade...</option>
              {GRADES.map((g) => (<option key={g} value={g}>{g === "PK" ? "Pre-K" : g === "K" ? "Kindergarten" : `Grade ${g}`}</option>))}
            </select>
          </Field>
        </div>

        <Field label="Gender">
          <div className="flex flex-wrap gap-4">
            {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => (
              <label key={g} className="flex items-center gap-2 text-sm">
                <input type="radio" name={`gender-${index}`} value={g} checked={child.gender === g} onChange={() => onUpdate({ gender: g as ChildFormData["gender"] })} className="accent-zinc-900" />
                {g}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Ethnicity">
          <div className="flex flex-wrap gap-4">
            {ETHNICITIES.map((eth) => (
              <label key={eth} className="flex items-center gap-2 text-sm">
                <Checkbox checked={child.ethnicity.includes(eth)} onCheckedChange={() => toggleEthnicity(eth)} />
                {eth}
              </label>
            ))}
          </div>
        </Field>

        {/* School */}
        <Field label="School District">
          <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400" value={child.schoolDistrict} onChange={(e) => onUpdate({ schoolDistrict: e.target.value, schoolName: "" })} required>
            <option value="">Select district...</option>
            {DISTRICTS.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
        </Field>

        {child.schoolDistrict && child.schoolDistrict !== "Other" && (
          <Field label="School Name">
            <select className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400" value={child.schoolName} onChange={(e) => onUpdate({ schoolName: e.target.value })} required>
              <option value="">Select school...</option>
              {filteredSchools.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
            </select>
          </Field>
        )}

        {child.schoolDistrict === "Other" && (
          <Field label="School Name">
            <Input placeholder="Enter school name" value={child.schoolName} onChange={(e) => onUpdate({ schoolName: e.target.value })} required />
          </Field>
        )}

        {/* Preferences */}
        <Field label="Would this child benefit from extra moisturizing products for coarse/coily hair?">
          <div className="flex gap-6">
            {[{ label: "Yes", value: "true" }, { label: "No", value: "false" }].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input type="radio" name={`hair-${index}`} value={opt.value} checked={child.ethnicHairPreference === opt.value} onChange={() => onUpdate({ ethnicHairPreference: opt.value as "true" | "false" })} className="accent-zinc-900" />
                {opt.label}
              </label>
            ))}
          </div>
        </Field>

        {showMenstruation && (
          <Field label="Menstruation product preference">
            <div className="flex gap-6">
              {["Pads", "Tampons", "None"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={`menstruation-${index}`} value={opt} checked={child.menstruationPreference === opt} onChange={() => onUpdate({ menstruationPreference: opt as "Pads" | "Tampons" | "None" })} className="accent-zinc-900" />
                  {opt}
                </label>
              ))}
            </div>
          </Field>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, error, optional, children }: { label: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}{optional && <span className="ml-1 text-xs text-zinc-400">(optional)</span>}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
