import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  // Quick connection check — query a real table
  const { error } = await supabase.from("program_years").select("id").limit(1);
  const connected = !error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50">
      <main className="flex flex-col items-center gap-8 p-8">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Refresh North Texas
          </h1>
          <p className="text-lg text-zinc-600">
            Student Registration &amp; Distribution Tracking
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            System Status
          </h2>
          <div className="flex flex-col gap-3">
            <StatusRow label="Next.js" ok />
            <StatusRow label="Tailwind CSS" ok />
            <StatusRow label="shadcn/ui" ok />
            <StatusRow label="Supabase" ok={connected} />
          </div>
        </div>

        <p className="text-sm text-zinc-400">Phase 1 — Project Setup</p>
      </main>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${
          ok ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className="text-sm text-zinc-700">{label}</span>
      <span className="text-xs text-zinc-400">{ok ? "Connected" : "Error"}</span>
    </div>
  );
}
