import { getUsers } from "@/lib/services/trading";
import { getHealthAction } from "./actions/trading";
import UserList from "./UserList";

export default async function Home() {
  const [initialUsers, health] = await Promise.all([
    getUsers(),
    getHealthAction(),
  ]);

  const ok = health.status === "UP" && health.database === "CONNECTED";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-5 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
              Portfolio Intelligence
            </p>
            <h1 className="text-3xl font-bold text-white drop-shadow-sm">
              User Trading Radar
            </h1>
            <p className="text-sm text-slate-400">
              Live leaderboard of trading activity, volumes, and risk.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
              ok
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                ok ? "bg-emerald-500" : "bg-amber-400"
              }`}
            />
            {ok ? "API Healthy" : "API Degraded"}
          </span>
        </header>

        <UserList initialUsers={initialUsers} />
      </div>
    </main>
  );
}
