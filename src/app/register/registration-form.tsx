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
} from "@/lib/schemas/registration";

interface School {
  id: string;
  district: string;
  name: string;
}

export function RegistrationForm({ schools }: { schools: School[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [guardianFirstName, setGuardianFirstName] = useState("");
  const [guardianLastName, setGuardianLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [county, setCounty] = useState("");

  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [schoolStudentId, setSchoolStudentId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [grade, setGrade] = useState("");
  const [gender, setGender] = useState("");
  const [ethnicity, setEthnicity] = useState<string[]>([]);

  const [schoolDistrict, setSchoolDistrict] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [otherSchoolName, setOtherSchoolName] = useState("");

  const [ethnicHairPreference, setEthnicHairPreference] = useState("");
  const [menstruationPreference, setMenstruationPreference] = useState("");

  // Derived state
  const gradeNum = useMemo(() => {
    if (grade === "PK") return -1;
    if (grade === "K") return 0;
    return parseInt(grade, 10) || -1;
  }, [grade]);

  const showMenstruation = gender === "Female" && gradeNum >= 5;

  const filteredSchools = useMemo(() => {
    if (!schoolDistrict || schoolDistrict === "Other") return [];
    return schools.filter((s) => s.district === schoolDistrict);
  }, [schoolDistrict, schools]);

  // Phone formatting
  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function toggleEthnicity(value: string) {
    setEthnicity((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]
    );
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
      childFirstName,
      childLastName,
      schoolStudentId: schoolStudentId || undefined,
      dateOfBirth,
      grade,
      gender: gender as RegistrationFormData["gender"],
      ethnicity,
      schoolDistrict,
      schoolName: schoolDistrict === "Other" ? otherSchoolName : schoolName,
      ethnicHairPreference: ethnicHairPreference as "true" | "false",
      menstruationPreference: showMenstruation
        ? (menstruationPreference as "Pads" | "Tampons" | "None")
        : undefined,
    };

    // Client-side validation
    const validationErrors: Record<string, string> = {};
    if (!guardianFirstName) validationErrors.guardianFirstName = "Required";
    if (!guardianLastName) validationErrors.guardianLastName = "Required";
    if (!email) validationErrors.email = "Required";
    if (!phone || !/^\(\d{3}\) \d{3}-\d{4}$/.test(phone))
      validationErrors.phone = "Format: (XXX) XXX-XXXX";
    if (!zipCode || !/^\d{5}$/.test(zipCode))
      validationErrors.zipCode = "Must be 5 digits";
    if (!county) validationErrors.county = "Required";
    if (!childFirstName) validationErrors.childFirstName = "Required";
    if (!childLastName) validationErrors.childLastName = "Required";
    if (!dateOfBirth) validationErrors.dateOfBirth = "Required";
    if (!grade) validationErrors.grade = "Required";
    if (!gender) validationErrors.gender = "Required";
    if (ethnicity.length === 0)
      validationErrors.ethnicity = "Select at least one";
    if (!schoolDistrict) validationErrors.schoolDistrict = "Required";
    if (schoolDistrict === "Other" && !otherSchoolName)
      validationErrors.schoolName = "Required";
    if (schoolDistrict !== "Other" && !schoolName)
      validationErrors.schoolName = "Required";
    if (!ethnicHairPreference)
      validationErrors.ethnicHairPreference = "Required";
    if (showMenstruation && !menstruationPreference)
      validationErrors.menstruationPreference = "Required";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    const res = await submitRegistration(formData);
    setResult(res);
    setLoading(false);
  }

  if (result?.success) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="pt-8 pb-8">
          <div className="mb-4 text-4xl">&#10003;</div>
          <h2 className="text-xl font-bold text-zinc-900">
            Registration Complete!
          </h2>
          <p className="mt-2 text-zinc-600">
            Your child has been registered with Refresh North Texas.
          </p>
          <p className="mt-4 text-lg font-semibold">
            Refresh ID: <span className="text-zinc-900">{result.refreshId}</span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Please save this ID for check-in at the distribution event.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {result?.error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {result.error}
        </div>
      )}

      {/* Guardian Information */}
      <Card>
        <CardHeader>
          <CardTitle>Guardian Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="First Name"
              error={errors.guardianFirstName}
            >
              <Input
                value={guardianFirstName}
                onChange={(e) => setGuardianFirstName(e.target.value)}
                required
              />
            </Field>
            <Field label="Last Name" error={errors.guardianLastName}>
              <Input
                value={guardianLastName}
                onChange={(e) => setGuardianLastName(e.target.value)}
                required
              />
            </Field>
          </div>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cell Phone Number" error={errors.phone}>
              <Input
                type="tel"
                placeholder="(XXX) XXX-XXXX"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                required
              />
            </Field>
            <Field label="Zip Code" error={errors.zipCode}>
              <Input
                placeholder="75035"
                maxLength={5}
                value={zipCode}
                onChange={(e) =>
                  setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                required
              />
            </Field>
          </div>
          <Field label="County" error={errors.county}>
            <select
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              required
            >
              <option value="">Select county...</option>
              {COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      {/* Child Information */}
      <Card>
        <CardHeader>
          <CardTitle>Child Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name" error={errors.childFirstName}>
              <Input
                value={childFirstName}
                onChange={(e) => setChildFirstName(e.target.value)}
                required
              />
            </Field>
            <Field label="Last Name" error={errors.childLastName}>
              <Input
                value={childLastName}
                onChange={(e) => setChildLastName(e.target.value)}
                required
              />
            </Field>
          </div>
          <Field
            label="Student ID"
            error={errors.schoolStudentId}
            optional
          >
            <Input
              placeholder="District-assigned ID (optional)"
              value={schoolStudentId}
              onChange={(e) => setSchoolStudentId(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of Birth" error={errors.dateOfBirth}>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </Field>
            <Field label="Grade" error={errors.grade}>
              <select
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
              >
                <option value="">Select grade...</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g === "PK" ? "Pre-K" : g === "K" ? "Kindergarten" : `Grade ${g}`}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Gender" error={errors.gender}>
            <div className="flex flex-wrap gap-4">
              {["Male", "Female", "Non-binary", "Prefer not to say"].map(
                (g) => (
                  <label key={g} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={(e) => setGender(e.target.value)}
                      className="accent-zinc-900"
                    />
                    {g}
                  </label>
                )
              )}
            </div>
          </Field>

          <Field label="Ethnicity" error={errors.ethnicity}>
            <div className="flex flex-wrap gap-4">
              {ETHNICITIES.map((eth) => (
                <label
                  key={eth}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={ethnicity.includes(eth)}
                    onCheckedChange={() => toggleEthnicity(eth)}
                  />
                  {eth}
                </label>
              ))}
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* School */}
      <Card>
        <CardHeader>
          <CardTitle>School</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="School District" error={errors.schoolDistrict}>
            <select
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
              value={schoolDistrict}
              onChange={(e) => {
                setSchoolDistrict(e.target.value);
                setSchoolName("");
                setOtherSchoolName("");
              }}
              required
            >
              <option value="">Select district...</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>

          {schoolDistrict && schoolDistrict !== "Other" && (
            <Field label="School Name" error={errors.schoolName}>
              <select
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              >
                <option value="">Select school...</option>
                {filteredSchools.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {schoolDistrict === "Other" && (
            <Field label="School Name" error={errors.schoolName}>
              <Input
                placeholder="Enter school name"
                value={otherSchoolName}
                onChange={(e) => setOtherSchoolName(e.target.value)}
                required
              />
            </Field>
          )}
        </CardContent>
      </Card>

      {/* Product Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Product Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Would your child benefit from extra moisturizing products for coarse/coily hair?"
            error={errors.ethnicHairPreference}
          >
            <div className="flex gap-6">
              {[
                { label: "Yes", value: "true" },
                { label: "No", value: "false" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="ethnicHairPreference"
                    value={opt.value}
                    checked={ethnicHairPreference === opt.value}
                    onChange={(e) => setEthnicHairPreference(e.target.value)}
                    className="accent-zinc-900"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </Field>

          {showMenstruation && (
            <Field
              label="Menstruation product preference"
              error={errors.menstruationPreference}
            >
              <div className="flex gap-6">
                {["Pads", "Tampons", "None"].map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="menstruationPreference"
                      value={opt}
                      checked={menstruationPreference === opt}
                      onChange={(e) =>
                        setMenstruationPreference(e.target.value)
                      }
                      className="accent-zinc-900"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </Field>
          )}
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Submitting..." : "Register"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  optional,
  children,
}: {
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {label}
        {optional && (
          <span className="ml-1 text-xs text-zinc-400">(optional)</span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
