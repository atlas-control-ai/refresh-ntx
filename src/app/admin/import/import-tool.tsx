"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importCSVData, type ImportRow, type ImportResult } from "./actions";

interface Cycle {
  id: string;
  season: string;
  program_years: { label: string } | null;
}

const SEASON_LABELS: Record<string, string> = {
  aug: "August",
  nov: "November",
  feb: "February",
  may: "May",
};

const IMPORT_FIELDS: { key: keyof ImportRow; label: string; required: boolean }[] = [
  { key: "guardianFirstName", label: "Guardian First Name", required: false },
  { key: "guardianLastName", label: "Guardian Last Name", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "zipCode", label: "Zip Code", required: false },
  { key: "county", label: "County", required: false },
  { key: "childFirstName", label: "Child First Name", required: true },
  { key: "childLastName", label: "Child Last Name", required: true },
  { key: "dateOfBirth", label: "Date of Birth", required: false },
  { key: "schoolStudentId", label: "Student ID", required: false },
  { key: "grade", label: "Grade", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "ethnicity", label: "Ethnicity", required: false },
  { key: "ethnicHairPreference", label: "Ethnic Hair Preference", required: false },
  { key: "menstruationPreference", label: "Menstruation Preference", required: false },
  { key: "schoolDistrict", label: "School District", required: false },
  { key: "schoolName", label: "School Name", required: false },
  { key: "packCode", label: "Pack Code", required: false },
  { key: "pickupCompleted", label: "Pickup Completed", required: false },
  { key: "pickupDate", label: "Pickup Date", required: false },
  { key: "schoolDeliveryCompleted", label: "School Delivery Completed", required: false },
  { key: "schoolDeliveryDate", label: "School Delivery Date", required: false },
  { key: "binCompleted", label: "Bin Completed", required: false },
  { key: "binDate", label: "Bin Date", required: false },
  { key: "submittedAt", label: "Submission Date", required: false },
];

type Step = "upload" | "map" | "preview" | "importing" | "done";

export function ImportTool({ cycles }: { cycles: Cycle[] }) {
  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<keyof ImportRow, string>>({} as Record<keyof ImportRow, string>);
  const [cycleId, setCycleId] = useState(cycles[0]?.id ?? "");
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        setCsvHeaders(headers);
        setCsvData(results.data as Record<string, string>[]);

        // Auto-map by fuzzy matching header names
        const autoMap: Record<string, string> = {};
        for (const field of IMPORT_FIELDS) {
          const match = headers.find((h) => {
            const hLower = h.toLowerCase().replace(/[^a-z]/g, "");
            const fLower = field.label.toLowerCase().replace(/[^a-z]/g, "");
            return hLower === fLower || hLower.includes(fLower) || fLower.includes(hLower);
          });
          if (match) autoMap[field.key] = match;
        }
        setMapping(autoMap as Record<keyof ImportRow, string>);
        setStep("map");
      },
    });
  }, []);

  function applyMapping(): ImportRow[] {
    return csvData.map((row) => {
      const mapped: Record<string, string> = {};
      for (const field of IMPORT_FIELDS) {
        const csvCol = mapping[field.key];
        mapped[field.key] = csvCol ? (row[csvCol] ?? "") : "";
      }
      return mapped as unknown as ImportRow;
    });
  }

  async function handleImport() {
    setStep("importing");
    const rows = applyMapping();
    const res = await importCSVData(rows, cycleId);
    setResult(res);
    setStep("done");
  }

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Target Cycle</Label>
            <select
              className="mt-1 flex h-9 w-full max-w-sm rounded-md border border-zinc-200 bg-white px-3 text-sm"
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.program_years?.label} {SEASON_LABELS[c.season] ?? c.season}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>CSV File</Label>
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="mt-1 block w-full text-sm text-zinc-500 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Upload a CSV exported from your existing Google Spreadsheet.
            You will map columns in the next step.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "map") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              Map Columns
              <span className="ml-2 text-sm font-normal text-zinc-500">
                {csvData.length} rows detected, {csvHeaders.length} columns
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs">
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </Label>
                  <select
                    className="mt-0.5 flex h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
                    value={mapping[field.key] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                  >
                    <option value="">— skip —</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preview first 5 rows */}
        <Card>
          <CardHeader>
            <CardTitle>Preview (first 5 rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    {IMPORT_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                      <th
                        key={f.key}
                        className="border-b px-2 py-1 text-left font-medium text-zinc-500"
                      >
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applyMapping()
                    .slice(0, 5)
                    .map((row, i) => (
                      <tr key={i}>
                        {IMPORT_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                          <td
                            key={f.key}
                            className="border-b px-2 py-1 text-zinc-700"
                          >
                            {row[f.key] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleImport}>
            Import {csvData.length} Records
          </Button>
          <Button variant="outline" onClick={() => setStep("upload")}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (step === "importing") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-lg font-medium text-zinc-900">Importing...</p>
            <p className="mt-1 text-sm text-zinc-500">
              Processing {csvData.length} records. This may take a moment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "done" && result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Total Rows" value={result.total} />
            <StatCard label="Created" value={result.created} color="green" />
            <StatCard label="Duplicates Flagged" value={result.duplicates} color="amber" />
            <StatCard label="Errors" value={result.errors} color="red" />
          </div>

          {result.errorMessages.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <h3 className="text-sm font-medium text-red-800">Error Details</h3>
              <ul className="mt-2 max-h-60 space-y-1 overflow-auto text-xs text-red-700">
                {result.errorMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={() => { setStep("upload"); setResult(null); setCsvData([]); }}>
            Import Another File
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green" | "amber" | "red";
}) {
  const colorClass = color === "green"
    ? "text-green-700"
    : color === "amber"
    ? "text-amber-700"
    : color === "red"
    ? "text-red-700"
    : "text-zinc-900";

  return (
    <div className="rounded-md border p-3 text-center">
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
