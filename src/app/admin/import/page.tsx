import { createClient } from "@/lib/supabase/server";
import { ImportTool } from "./import-tool";

export default async function ImportPage() {
  const supabase = await createClient();

  const { data: cycles } = await supabase
    .from("cycles")
    .select("id, season, program_years(label)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">CSV Import</h1>
        <p className="text-sm text-zinc-500">
          Import student data from an existing spreadsheet. Map CSV columns to the fields below.
        </p>
      </div>
      <ImportTool cycles={cycles ?? []} />
    </div>
  );
}
