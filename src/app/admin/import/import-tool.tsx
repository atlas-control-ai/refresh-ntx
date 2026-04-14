"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importBatch, resetRefreshIdSequence, type ImportResult } from "./actions";

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

const BATCH_SIZE = 20;

type Step = "upload" | "preview" | "importing" | "done";

export function ImportTool({ cycles }: { cycles: Cycle[] }) {
  const [step, setStep] = useState<Step>("upload");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });

  const augCycle = cycles.find((c) => c.season === "aug");
  const novCycle = cycles.find((c) => c.season === "nov");
  const febCycle = cycles.find((c) => c.season === "feb");
  const mayCycle = cycles.find((c) => c.season === "may");

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvHeaders(results.meta.fields ?? []);
          setCsvData(results.data);
          setStep("preview");
        },
      });
    },
    []
  );

  async function handleImport() {
    setStep("importing");
    setProgress({ processed: 0, total: csvData.length });

    const cycleIds = {
      aug: augCycle?.id ?? "",
      nov: novCycle?.id ?? "",
      feb: febCycle?.id,
      may: mayCycle?.id,
    };

    const totals: ImportResult = {
      total: csvData.length,
      created: 0,
      duplicates: 0,
      skipped: 0,
      errors: 0,
      errorMessages: [],
    };

    // Process in batches
    for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
      const batch = csvData.slice(i, i + BATCH_SIZE);

      try {
        const batchResult = await importBatch(batch, cycleIds, i);
        totals.created += batchResult.created;
        totals.duplicates += batchResult.duplicates;
        totals.skipped += batchResult.skipped;
        totals.errors += batchResult.errors;
        totals.errorMessages.push(...batchResult.errorMessages);
      } catch (err) {
        totals.errors += batch.length;
        totals.errorMessages.push(
          `Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }

      setProgress({ processed: Math.min(i + BATCH_SIZE, csvData.length), total: csvData.length });
    }

    // Reset the refresh_id sequence after all imports
    try {
      await resetRefreshIdSequence();
    } catch {
      // non-critical
    }

    setResult(totals);
    setStep("done");
  }

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload Refresh NTX Spreadsheet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Detected Cycles</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {cycles.map((c) => (
                <Badge key={c.id} variant="secondary">
                  {c.program_years?.label} {SEASON_LABELS[c.season] ?? c.season}
                </Badge>
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Distribution data will be imported into the matching season cycles.
            </p>
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
            Upload the &ldquo;Form Responses&rdquo; CSV export from Google Sheets.
            Columns will be auto-mapped based on the known spreadsheet format.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "preview") {
    const expectedCols = [
      "Child's Name - First Name",
      "Child's Name - Last Name",
      "Pack Code",
      "Refresh ID",
    ];
    const hasExpectedCols = expectedCols.every((c) =>
      csvHeaders.includes(c)
    );

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              Preview
              <span className="ml-2 text-sm font-normal text-zinc-500">
                {csvData.length} rows, {csvHeaders.length} columns
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasExpectedCols && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Warning: Some expected columns are missing. Make sure this is the
                correct Refresh NTX spreadsheet export.
              </div>
            )}

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Refresh ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Pack</TableHead>
                    <TableHead>District</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-zinc-400">{i + 1}</TableCell>
                      <TableCell className="font-mono">
                        {row["Refresh ID"]}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row["Child's Name - First Name"]}{" "}
                        {row["Child's Name - Last Name"]}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {row["Parent or Guardian's Name  - First Name"]}{" "}
                        {row["Parent or Guardian's Name  - Last Name"]}
                      </TableCell>
                      <TableCell>
                        {row["Grade for the 2025 - 2026 School Year"]}
                      </TableCell>
                      <TableCell className="text-zinc-500 max-w-[150px] truncate">
                        {row["Frisco ISD Schools"] ||
                          row["Little Elm ISD Schools"] ||
                          row["Denton ISD Schools"] ||
                          row["North Texas Collegiate Academy"] ||
                          row["Other Schools"] ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {row["Pack Code"]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {row["School District"]}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {csvData.length > 10 && (
              <p className="text-xs text-zinc-500">
                Showing first 10 of {csvData.length} rows.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleImport} size="lg">
            Import {csvData.length} Records
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setStep("upload");
              setCsvData([]);
            }}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (step === "importing") {
    const pct = progress.total
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;

    return (
      <Card>
        <CardContent className="py-16">
          <div className="mx-auto max-w-md text-center">
            <p className="text-lg font-medium text-zinc-900">
              Importing records...
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {progress.processed} of {progress.total} processed
            </p>

            {/* Progress bar */}
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-medium text-zinc-700">{pct}%</p>

            <p className="mt-4 text-xs text-zinc-400">
              Processing in batches of {BATCH_SIZE}. Please don&apos;t close this page.
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
            <StatCard
              label="Duplicates Flagged"
              value={result.duplicates}
              color="amber"
            />
            <StatCard label="Errors" value={result.errors} color="red" />
          </div>
          {result.skipped > 0 && (
            <p className="text-sm text-zinc-500">
              {result.skipped} rows skipped (missing student name).
            </p>
          )}

          {result.errorMessages.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <h3 className="text-sm font-medium text-red-800">
                Error Details ({result.errorMessages.length})
              </h3>
              <ul className="mt-2 max-h-60 space-y-1 overflow-auto text-xs text-red-700">
                {result.errorMessages.slice(0, 50).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
                {result.errorMessages.length > 50 && (
                  <li>... and {result.errorMessages.length - 50} more</li>
                )}
              </ul>
            </div>
          )}

          <Button
            onClick={() => {
              setStep("upload");
              setResult(null);
              setCsvData([]);
            }}
          >
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
  const colorClass =
    color === "green"
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
