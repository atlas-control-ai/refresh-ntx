import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "./registration-form";

export default async function RegisterPage() {
  const supabase = await createClient();

  // Check if registration is open for the active program year
  const { data: activeYear } = await supabase
    .from("program_years")
    .select("id, label, is_registration_open")
    .eq("is_active", true)
    .single();

  if (!activeYear || !activeYear.is_registration_open) {
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
            Please check back when registration opens for the next program year.
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
            Student Registration — {activeYear.label}
          </p>
        </div>
        <RegistrationForm schools={schools ?? []} />
      </div>
    </div>
  );
}
