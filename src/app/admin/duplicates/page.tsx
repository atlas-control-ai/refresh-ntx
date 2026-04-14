import { createClient } from "@/lib/supabase/server";
import { DuplicateQueue } from "./duplicate-queue";

export default async function DuplicatesPage() {
  const supabase = await createClient();

  // Get all students flagged as duplicates (unresolved)
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
    .order("created_at", { ascending: false })
    .limit(50);

  // Collect all names and DOBs to find matches in ONE query
  const names = new Set<string>();
  const dobs = new Set<string>();
  const studentIds = new Set<string>();
  const flaggedIds = new Set<string>();

  for (const s of flagged ?? []) {
    flaggedIds.add(s.id);
    names.add(s.first_name.toLowerCase());
    names.add(s.last_name.toLowerCase());
    dobs.add(s.date_of_birth);
    if (s.school_student_id) studentIds.add(s.school_student_id);
  }

  // Fetch ALL potential match candidates in one query
  // Match on: same last name OR same DOB
  let allCandidates: typeof flagged = [];
  if (flagged && flagged.length > 0) {
    const dobList = Array.from(dobs);
    const lastNames = Array.from(new Set((flagged ?? []).map((s) => s.last_name)));

    // Query students matching any of the last names or DOBs
    const { data } = await supabase
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
      .or(
        lastNames.map((n) => `last_name.ilike.${n}`).join(",") +
          "," +
          dobList.map((d) => `date_of_birth.eq.${d}`).join(",")
      )
      .limit(500);

    allCandidates = data ?? [];
  }

  // Build matches client-side
  const candidateMap = new Map(
    (allCandidates ?? []).map((c) => [c.id, c])
  );

  const duplicatesWithMatches = (flagged ?? []).map((student) => {
    const matches = (allCandidates ?? []).filter((c) => {
      if (c.id === student.id) return false;
      let signals = 0;
      if (
        c.first_name.toLowerCase() === student.first_name.toLowerCase() &&
        c.last_name.toLowerCase() === student.last_name.toLowerCase()
      )
        signals++;
      if (c.date_of_birth === student.date_of_birth) signals++;
      if (
        student.school_student_id &&
        c.school_student_id === student.school_student_id
      )
        signals++;
      return signals >= 2;
    });

    return { student, matches };
  });

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
