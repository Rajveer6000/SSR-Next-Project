"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchUsersAction } from "./actions/trading";
import type { UserStats } from "@/lib/services/trading";

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
  const isFetching = useRef(false);
  const lastCursorRef = useRef<string | null>(
    initialUsers.length > 0 ? initialUsers[initialUsers.length - 1].id : null
  );

  const fetchUsers = useCallback(async () => {
    // Strict guard to prevent duplicate network calls
    if (isFetching.current || !hasMore) return;

    isFetching.current = true;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchUsersAction(lastCursorRef.current ?? undefined);

      if (!data || data.length === 0) {
        setHasMore(false);
      } else {
        // Update cursor before state to ensure next trigger is accurate
        lastCursorRef.current = data[data.length - 1].id;

        setUsers((prev) => {
          const existingIds = new Set(prev.map((u) => u.id));
          const uniqueNewUsers = data.filter((u) => !existingIds.has(u.id));
          return [...prev, ...uniqueNewUsers];
        });

        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
      // Small timeout prevents the observer from firing again before DOM updates
      setTimeout(() => {
        isFetching.current = false;
      }, 150);
    }
  }, [hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching.current) {
          fetchUsers();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: "100px" // Reduced margin to prevent premature triggers
      }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchUsers, hasMore]);

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {users.map((user) => (
          <article
            key={user.id}
            className="group relative rounded-2xl border border-white/5 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-emerald-500/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Trader
                </p>
                <h2 className="truncate text-lg font-bold text-white">
                  {user.name ?? "Anonymous"}
                </h2>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              </div>
              <div className="shrink-0 rounded-xl bg-amber-500/10 px-3 py-1.5 text-right border border-amber-500/10">
                <p className="text-[9px] font-black uppercase text-amber-500/80">Risk</p>
                <p className="text-lg font-black text-amber-400 leading-none">
                  {user.stats.riskScore}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
              <Stat label="Total Volume" value={user.stats.totalVolume} fmt="currency" />
              <Stat label="Latest Balance" value={user.stats.latestBalance} fmt="currency" />
              <Stat label="Buys" value={user.stats.buyCount} />
              <Stat label="Sells" value={user.stats.sellCount} />
              <Stat label="Open" value={user.stats.openTrades} highlight />
              <Stat label="Closed" value={user.stats.closedTrades} />
            </div>
          </article>
        ))}
      </section>

      {/* Sentinel & Status */}
      <div ref={sentinelRef} className="flex min-h-[100px] flex-col items-center justify-center gap-4">
        {loading && (
          <div className="flex items-center gap-3 rounded-full bg-slate-800/50 px-4 py-2 border border-white/5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:0.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:0.4s]" />
            <span className="text-xs font-medium text-slate-400 ml-1">Syncing Data...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {!hasMore && users.length > 0 && (
          <div className="flex w-full items-center gap-4 px-10">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">End of records</p>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  fmt,
  highlight = false,
}: {
  label: string;
  value: number;
  fmt?: "currency";
  highlight?: boolean;
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
    <div className="rounded-xl border border-white/[0.03] bg-white/[0.02] px-3 py-2.5 transition-colors group-hover:bg-white/[0.05]">
      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`text-sm font-bold ${highlight ? "text-emerald-400" : "text-white"}`}>
        {display}
      </p>
    </div>
  );
}