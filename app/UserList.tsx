"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchUsersAction } from "./actions/trading";
import { UserStats } from "./lib/trading";

type UserListProps = {
  initialUsers: UserStats[];
};

const PAGE_SIZE = 20;

export default function UserList({ initialUsers }: UserListProps) {
  const [users, setUsers] = useState<UserStats[]>(initialUsers);
  const [hasMore, setHasMore] = useState(initialUsers.length >= PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlight = useRef(false);
  const lastCursorRef = useRef<string | null>(
    initialUsers.length > 0 ? initialUsers[initialUsers.length - 1].id : null
  );

  const fetchUsers = useCallback(async () => {
    if (inFlight.current || !hasMore) return;

    inFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchUsersAction(lastCursorRef.current ?? undefined);

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setUsers((prev: UserStats[]) => {
          const seen = new Set(prev.map((u: UserStats) => u.id));
          const filtered = data.filter((u: UserStats) => !seen.has(u.id));
          return [...prev, ...filtered];
        });

        lastCursorRef.current = data[data.length - 1].id;

        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !inFlight.current) {
          fetchUsers();
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [fetchUsers, hasMore]);

  return (
    <>
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
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
              <div className="rounded-xl bg-amber-500/15 px-3 py-2 text-right text-xs font-semibold leading-tight text-amber-200">
                <p>Risk</p>
                <p className="text-lg font-bold text-amber-400">
                  {user.stats.riskScore}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Stat
                label="Total Volume"
                value={user.stats.totalVolume}
                fmt="currency"
              />
              <Stat
                label="Latest Balance"
                value={user.stats.latestBalance}
                fmt="currency"
              />
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
    </>
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
