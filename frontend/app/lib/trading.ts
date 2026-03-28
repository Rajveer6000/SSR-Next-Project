import { prisma } from "./prisma";

// 🔥 Heavier calculation (simulate high CPU load on Node server)
export const heavyCalculation = (seed: number): number => {
  let result = seed;

  // Significant CPU work simulation (500,000 iterations per user)
  for (let j = 0; j < 500000; j++) {
    result = Math.sqrt(result * 1.0001 + j);
  }

  return Number(result.toFixed(2));
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable = error.message?.includes("Can't reach database server") || 
                          error.message?.includes("connection") ||
                          error.name === "PrismaClientInitializationError";
      
      if (isRetryable && i < retries - 1) {
        console.log(`[Retry ${i + 1}/${retries}] Database unreachable. Retrying in ${delay * Math.pow(2, i)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export type UserStats = {
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

export async function getUsers(cursor?: string): Promise<UserStats[]> {
  const LIMIT = 20;

  const rawData: any[] = await withRetry(() => prisma.$queryRawUnsafe(`
    SELECT 
        u.id, 
        u.name, 
        u.email,
        COALESCE(t.total_volume, 0)::float as "totalVolume",
        COALESCE(t.buy_count, 0)::int as "buyCount",
        COALESCE(t.sell_count, 0)::int as "sellCount",
        COALESCE(t.open_trades, 0)::int as "openTrades",
        COALESCE(t.closed_trades, 0)::int as "closedTrades",
        COALESCE(l.latest_balance, 0)::float as "latestBalance"
    FROM users u
    LEFT JOIN (
        SELECT 
            user_id,
            SUM(total_value) as total_volume,
            COUNT(*) FILTER (WHERE trade_type = 'buy') as buy_count,
            COUNT(*) FILTER (WHERE trade_type = 'sell') as sell_count,
            COUNT(*) FILTER (WHERE status = 'open') as open_trades,
            COUNT(*) FILTER (WHERE status = 'closed') as closed_trades
        FROM trades
        GROUP BY user_id
    ) t ON t.user_id = u.id
    LEFT JOIN (
        SELECT DISTINCT ON (user_id) 
            user_id, 
            balance as latest_balance
        FROM portfolio_logs
        ORDER BY user_id, created_at DESC
    ) l ON l.user_id = u.id
    ${cursor ? `WHERE u.id > '${cursor}'` : ""} 
    ORDER BY u.id ASC
    LIMIT ${LIMIT};
  `));

  if (rawData.length === 0) return [];

  const finalResult: UserStats[] = [];

  for (const row of rawData) {
    const riskScore = heavyCalculation(row.totalVolume);

    finalResult.push({
      id: row.id,
      name: row.name,
      email: row.email,
      stats: {
        totalVolume: row.totalVolume,
        buyCount: row.buyCount,
        sellCount: row.sellCount,
        openTrades: row.openTrades,
        closedTrades: row.closedTrades,
        latestBalance: row.latestBalance,
        riskScore,
      },
    });
  }

  return finalResult;
}
