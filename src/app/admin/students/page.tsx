import { createClient } from "@/lib/supabase/server";
import { StudentList } from "./student-list";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const search = params.q ?? "";
  const district = params.district ?? "";
  const packCode = params.pack_code ?? "";
  const unenrolled = params.unenrolled ?? "";
  const duplicate = params.duplicate ?? "";
  const yearId = params.year ?? "";

  // Build student query
  let query = supabase
    .from("students")
    .select(
      `
      id, refresh_id, first_name, last_name, date_of_birth, gender,
      is_unenrolled, is_duplicate, school_student_id, created_at,
      guardians(first_name, last_name, email, phone),
      enrollments(id, pack_code, grade, school_district, school_name, program_year_id)
    `
    )
    .order("refresh_id", { ascending: true });

  // Filters
  if (unenrolled === "true") query = query.eq("is_unenrolled", true);
  if (unenrolled === "false") query = query.eq("is_unenrolled", false);
  if (duplicate === "true") query = query.eq("is_duplicate", true);

  const { data: students, error } = await query.limit(500);

  if (error) {
    return <div className="p-8 text-red-600">Error loading students: {error.message}</div>;
  }

  // Client-side filtering for search and enrollment-based filters
  let filtered = students ?? [];

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((s) => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const refreshId = s.refresh_id.toString();
      const studentId = (s.school_student_id ?? "").toLowerCase();
      const schoolMatch = s.enrollments?.some(
        (e: { school_name: string }) => e.school_name.toLowerCase().includes(q)
      );
      const packMatch = s.enrollments?.some(
        (e: { pack_code: string }) => e.pack_code.toLowerCase() === q
      );
      const gradeMatch = s.enrollments?.some(
        (e: { grade: string }) => e.grade.toLowerCase() === q
      );
      return (
        fullName.includes(q) ||
        refreshId.includes(q) ||
        studentId.includes(q) ||
        schoolMatch ||
        packMatch ||
        gradeMatch
      );
    });
  }

  if (district) {
    filtered = filtered.filter((s) =>
      s.enrollments?.some(
        (e: { school_district: string }) => e.school_district === district
      )
    );
  }

  if (packCode) {
    filtered = filtered.filter((s) =>
      s.enrollments?.some(
        (e: { pack_code: string }) => e.pack_code === packCode
      )
    );
  }

  if (yearId) {
    filtered = filtered.filter((s) =>
      s.enrollments?.some(
        (e: { program_year_id: string }) => e.program_year_id === yearId
      )
    );
  }

  // Fetch program years for filter dropdown
  const { data: programYears } = await supabase
    .from("program_years")
    .select("id, label")
    .order("label", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Student Registry</h1>
          <p className="text-sm text-zinc-500">{filtered.length} students</p>
        </div>
      </div>
      <StudentList
        students={filtered}
        programYears={programYears ?? []}
        initialSearch={search}
        initialDistrict={district}
        initialPackCode={packCode}
        initialUnenrolled={unenrolled}
        initialDuplicate={duplicate}
        initialYear={yearId}
      />
    </div>
  );
}
