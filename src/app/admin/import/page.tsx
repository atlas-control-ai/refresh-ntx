import { createClient } from "@/lib/supabase/server";
import { ImportTool } from "./import-tool";

export default async function ImportPage() {
  const supabase = await createClient();

  const { data: programYears } = await supabase
    .from("program_years")
    .select("id, label, is_active")
    .order("label", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">CSV Import</h1>
        <p className="text-sm text-zinc-500">
          Import student data from an existing spreadsheet.
        </p>
      </div>
      <ImportTool programYears={programYears ?? []} />
    </div>
  );
}
