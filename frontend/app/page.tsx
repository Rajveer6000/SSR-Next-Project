"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UserStats = {
  id: string;
  name: string | null;
  email: string | null;
  stats: {
    totalVolume: number;
    buyCount: number;
    sellCount: number;
    openTrades: number;
    closedTrades: number;
    latestBalance: number;
    riskScore: number;
  };
};

type Health = { status: string; database: string; timestamp: string };

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
const PAGE_SIZE = 20; // backend returns 20 at a time

export default function Home() {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial health
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(
    async (nextCursor?: string | null) => {
      if (loading || !hasMore) return;
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`${API_BASE}/api/users`);
        if (nextCursor) url.searchParams.set("cursor", nextCursor);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data: UserStats[] = await res.json();

        setUsers((prev) => {
          const seen = new Set(prev.map((u) => u.id));
          const filtered = data.filter((u) => !seen.has(u.id));
          return [...prev, ...filtered];
        });

        const newCursor = data.length > 0 ? data[data.length - 1].id : null;
        setCursor(newCursor);
        setHasMore(data.length === PAGE_SIZE && !!newCursor);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load users";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [hasMore, loading]
  );

  // Initial load
  useEffect(() => {
    fetchUsers(null);
  }, [fetchUsers]);

  // Infinite scroll observer
  useEffect(() => {
    const target = sentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loading) {
          fetchUsers(cursor);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, fetchUsers, hasMore, loading]);

  const statusChip = useMemo(() => {
    if (!health) return null;
    const ok = health.status === "UP" && health.database === "CONNECTED";
    return (
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
    );
  }, [health]);

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
          {statusChip}
        </header>

        <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <article
              key={user.id}
              className="group rounded-3xl border border-white/5 bg-slate-900/70 p-5 shadow-lg shadow-black/40 backdrop-blur transition hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-emerald-500/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">
                    User
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    {user.name ?? "Anonymous"}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {user.email}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-500/15 px-3 py-2 text-right text-xs font-semibold leading-tight text-amber-200">
                  <p>Risk</p>
                  <p className="text-lg font-bold text-amber-400">
                    {user.stats.riskScore}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Total Volume" value={user.stats.totalVolume} fmt="currency" />
                <Stat label="Latest Balance" value={user.stats.latestBalance} fmt="currency" />
                <Stat label="Buys" value={user.stats.buyCount} />
                <Stat label="Sells" value={user.stats.sellCount} />
                <Stat label="Open Trades" value={user.stats.openTrades} />
                <Stat label="Closed Trades" value={user.stats.closedTrades} />
              </div>
            </article>
          ))}
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
            {error}
          </div>
        )}

        <div ref={sentinelRef} className="h-10 w-full">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
              Loading more users…
            </div>
          )}
          {!hasMore && users.length > 0 && (
            <p className="text-center text-sm text-slate-500">
              You’ve reached the end.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  fmt,
}: {
  label: string;
  value: number;
  fmt?: "currency";
}) {
  const display =
    fmt === "currency"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(value)
      : value.toLocaleString();

  return (
    <div className="rounded-xl border border-white/5 bg-slate-800/60 px-3 py-3 text-slate-200 shadow-inner shadow-black/30">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="text-lg font-semibold text-white">{display}</p>
    </div>
  );
}
