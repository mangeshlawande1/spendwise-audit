import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="font-display text-3xl text-white mb-2">Audit not found</h1>
      <p className="text-slate-400 text-sm max-w-sm mb-8">
        This audit link may have expired (our in-memory store resets on server
        restart). Run a new audit — it only takes 2 minutes.
      </p>
      <Link
        href="/audit"
        className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all"
      >
        Run a new audit →
      </Link>
    </main>
  );
}
