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
      households(id, primary_email, primary_phone),
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

  // Get siblings in same household
  let siblings: Array<{ id: string; refresh_id: number; first_name: string; last_name: string }> = [];
  if (student.household_id) {
    const { data } = await supabase
      .from("students")
      .select("id, refresh_id, first_name, last_name")
      .eq("household_id", student.household_id)
      .neq("id", id);
    siblings = data ?? [];
  }

  // Sort enrollments by submitted_at descending
  student.enrollments?.sort(
    (a: { submitted_at: string }, b: { submitted_at: string }) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );

  // Get user email for verification attribution
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <StudentProfile
      student={student}
      siblings={siblings}
      isAdmin={role === "admin"}
      currentUserEmail={user?.email ?? "admin"}
    />
  );
}
