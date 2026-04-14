import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/get-role";
import { StudentProfile } from "./student-profile";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const role = await getUserRole();

  const { data: student, error } = await supabase
    .from("students")
    .select(
      `
      *,
      guardians(*),
      enrollments(
        *,
        program_years(label),
        distributions(*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !student) notFound();

  // Sort enrollments by submitted_at descending
  student.enrollments?.sort(
    (a: { submitted_at: string }, b: { submitted_at: string }) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );

  return (
    <StudentProfile student={student} isAdmin={role === "admin"} />
  );
}
