import { createClient } from "@/lib/supabase/server";
import { DuplicateQueue } from "./duplicate-queue";

export default async function DuplicatesPage() {
  const supabase = await createClient();

  // Get all students flagged as duplicates that haven't been confirmed yet
  // (is_duplicate = true AND duplicate_of_id IS NULL means flagged but not yet resolved)
  const { data: flagged } = await supabase
    .from("students")
    .select(
      `
      id, refresh_id, first_name, last_name, date_of_birth, gender,
      school_student_id, notes, is_duplicate, duplicate_of_id, created_at,
      guardians(first_name, last_name, email, phone),
      enrollments(grade, school_name, pack_code,
        program_years(label)
      )
    `
    )
    .eq("is_duplicate", true)
    .is("duplicate_of_id", null)
    .order("created_at", { ascending: false });

  // For each flagged student, find potential matches
  const duplicatesWithMatches = [];

  for (const student of flagged ?? []) {
    // Search for potential matches by name or DOB
    const { data: matches } = await supabase
      .from("students")
      .select(
        `
        id, refresh_id, first_name, last_name, date_of_birth, gender,
        school_student_id, notes, created_at,
        guardians(first_name, last_name, email, phone),
        enrollments(grade, school_name, pack_code,
          program_years(label)
        )
      `
      )
      .neq("id", student.id)
      .or(
        `and(first_name.ilike.${student.first_name},last_name.ilike.${student.last_name}),date_of_birth.eq.${student.date_of_birth}${
          student.school_student_id
            ? `,school_student_id.eq.${student.school_student_id}`
            : ""
        }`
      )
      .limit(5);

    duplicatesWithMatches.push({
      student,
      matches: matches ?? [],
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Duplicate Review</h1>
        <p className="text-sm text-zinc-500">
          {duplicatesWithMatches.length} flagged record{duplicatesWithMatches.length !== 1 ? "s" : ""} to review
        </p>
      </div>
      <DuplicateQueue items={duplicatesWithMatches} />
    </div>
  );
}
