import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "./registration-form";

export default async function RegisterPage() {
  const supabase = await createClient();

  // Check if there's an open cycle
  const { data: openCycle } = await supabase
    .from("cycles")
    .select("id, season, program_year_id, cycles_year:program_years(label)")
    .eq("is_open", true)
    .single();

  if (!openCycle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">
            Refresh North Texas
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            Registration is currently closed.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Please check back when the next cycle opens.
          </p>
        </div>
      </div>
    );
  }

  // Fetch schools for dropdown
  const { data: schools } = await supabase
    .from("schools")
    .select("id, district, name")
    .order("name");

  return (
    <div className="min-h-screen bg-zinc-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">
            Refresh North Texas
          </h1>
          <p className="mt-2 text-zinc-600">
            Student Registration Form
          </p>
        </div>
        <RegistrationForm schools={schools ?? []} />
      </div>
    </div>
  );
}
