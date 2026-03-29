import prisma from "../db/prisma";
import { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const message = error?.message ?? "";
      const isRetryable =
        message.includes("Can't reach database server") ||
        message.includes("connection") ||
        error?.name === "PrismaClientInitializationError";

      if (isRetryable && i < retries - 1) {
        const backoff = delay * Math.pow(2, i);
        console.warn(
          `[Retry ${i + 1}/${retries}] Database unreachable. Retrying in ${backoff}ms...`
        );
        await wait(backoff);
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export async function fetchUsersFromDb(cursor?: string) {
  const rows = await withRetry(() =>
    prisma.$queryRaw(
      Prisma.sql`
        SELECT 
          u.id, 
          u.name, 
          u.email,
          COALESCE(t.total_volume, 0)::float AS "totalVolume",
          COALESCE(t.buy_count, 0)::int AS "buyCount",
          COALESCE(t.sell_count, 0)::int AS "sellCount",
          COALESCE(t.open_trades, 0)::int AS "openTrades",
          COALESCE(t.closed_trades, 0)::int AS "closedTrades",
          COALESCE(l.latest_balance, 0)::float AS "latestBalance"
        FROM users u
        LEFT JOIN (
          SELECT 
            user_id,
            SUM(total_value) AS total_volume,
            COUNT(*) FILTER (WHERE trade_type = 'buy') AS buy_count,
            COUNT(*) FILTER (WHERE trade_type = 'sell') AS sell_count,
            COUNT(*) FILTER (WHERE status = 'open') AS open_trades,
            COUNT(*) FILTER (WHERE status = 'closed') AS closed_trades
          FROM trades
          GROUP BY user_id
        ) t ON t.user_id = u.id
        LEFT JOIN (
          SELECT DISTINCT ON (user_id) 
            user_id, 
            balance AS latest_balance
          FROM portfolio_logs
          ORDER BY user_id, created_at DESC
        ) l ON l.user_id = u.id
        ${cursor ? Prisma.sql`WHERE u.id > ${cursor}` : Prisma.sql``}
        ORDER BY u.id ASC
        LIMIT ${PAGE_SIZE};
      `
    )
  );

  return rows as any[];
}

export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Health check error:", error);
    return false;
  }
}
