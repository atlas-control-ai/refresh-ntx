import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "students";
  const yearId = searchParams.get("year");

  const supabase = await createClient();

  // Verify authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let csvContent = "";

  if (type === "students") {
    const { data } = await supabase
      .from("students")
      .select(
        `
        refresh_id, first_name, last_name, date_of_birth, gender, ethnicity,
        ethnic_hair_preference, school_student_id, is_unenrolled, is_duplicate, notes,
        guardians(first_name, last_name, email, phone, zip_code, county),
        enrollments(grade, pack_code, school_district, school_name, submitted_at,
          cycles(season, program_years(label))
        )
      `
      )
      .order("refresh_id");

    const headers = [
      "Refresh ID",
      "First Name",
      "Last Name",
      "DOB",
      "Gender",
      "Ethnicity",
      "Hair Preference",
      "Student ID",
      "Unenrolled",
      "Duplicate",
      "Guardian Name",
      "Email",
      "Phone",
      "Zip",
      "County",
      "Latest Grade",
      "Pack Code",
      "School District",
      "School",
      "Latest Cycle",
      "Notes",
    ];

    csvContent = headers.join(",") + "\n";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of (data ?? []) as any[]) {
      const guardian = s.guardians?.[0];
      const enrollment = s.enrollments?.[s.enrollments.length - 1];
      const cycle = enrollment?.cycles;

      csvContent +=
        [
          s.refresh_id,
          esc(s.first_name),
          esc(s.last_name),
          s.date_of_birth,
          s.gender,
          esc(s.ethnicity?.join("; ")),
          s.ethnic_hair_preference ? "Yes" : "No",
          esc(s.school_student_id ?? ""),
          s.is_unenrolled ? "Yes" : "No",
          s.is_duplicate ? "Yes" : "No",
          esc(guardian ? `${guardian.first_name} ${guardian.last_name}` : ""),
          esc(guardian?.email ?? ""),
          esc(guardian?.phone ?? ""),
          esc(guardian?.zip_code ?? ""),
          esc(guardian?.county ?? ""),
          esc(enrollment?.grade ?? ""),
          esc(enrollment?.pack_code ?? ""),
          esc(enrollment?.school_district ?? ""),
          esc(enrollment?.school_name ?? ""),
          esc(cycle ? `${cycle.program_years?.label ?? ""} ${cycle.season}` : ""),
          esc(s.notes ?? ""),
        ].join(",") + "\n";
    }
  } else if (type === "enrollments" && yearId) {
    const { data } = await supabase
      .from("enrollments")
      .select(
        `
        pack_code, grade, school_district, school_name, submitted_at,
        students!inner(refresh_id, first_name, last_name, gender, date_of_birth),
        distributions(season, method, completed, completed_at)
      `
      )
      .eq("program_year_id", yearId)
      .order("school_name");

    const headers = [
      "Refresh ID",
      "First Name",
      "Last Name",
      "Gender",
      "DOB",
      "Grade",
      "Pack Code",
      "School District",
      "School",
      "Pickup",
      "School Delivery",
      "Bin",
      "Submitted",
    ];

    csvContent = headers.join(",") + "\n";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const e of (data ?? []) as any[]) {
      const pickup = e.distributions?.find((d: { method: string }) => d.method === "pickup");
      const schoolDel = e.distributions?.find((d: { method: string }) => d.method === "school_delivery");
      const bin = e.distributions?.find((d: { method: string }) => d.method === "bin");

      csvContent +=
        [
          e.students.refresh_id,
          esc(e.students.first_name),
          esc(e.students.last_name),
          e.students.gender,
          e.students.date_of_birth,
          e.grade,
          e.pack_code,
          esc(e.school_district),
          esc(e.school_name),
          pickup?.completed ? "Yes" : "No",
          schoolDel?.completed ? "Yes" : "No",
          bin?.completed ? "Yes" : "No",
          e.submitted_at?.substring(0, 10) ?? "",
        ].join(",") + "\n";
    }
  } else {
    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="refresh-ntx-${type}-${new Date().toISOString().substring(0, 10)}.csv"`,
    },
  });
}

function esc(val: string): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
