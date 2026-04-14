export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 rounded bg-zinc-200" />
        <div className="mt-2 h-4 w-64 rounded bg-zinc-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-white p-6">
            <div className="h-4 w-24 rounded bg-zinc-100" />
            <div className="mt-3 h-8 w-16 rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-32 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-white p-6">
        <div className="h-4 w-40 rounded bg-zinc-200" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded bg-zinc-50" />
          ))}
        </div>
      </div>
    </div>
  );
}
