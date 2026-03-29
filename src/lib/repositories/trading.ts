import pool from "../db";

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const message = error?.message ?? "";
      const isRetryable =
        message.includes("ECONNREFUSED") ||
        message.includes("ENOTFOUND") ||
        message.includes("connection") ||
        message.includes("timeout") ||
        message.includes("terminating connection");

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

export async function fetchUsersRaw(cursor?: string) {
  const LIMIT = 20;
  
  // Notice: The user's exact aggregation query is maintained.
  // We use $1 for parameterization safely rather than raw string interpolation to prevent injection,
  // while preserving identical performance and intention.
  const query = `
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
    ${cursor ? `WHERE u.id > $1` : ''} 
    ORDER BY u.id ASC
    LIMIT ${LIMIT};
  `;
  
  const result = await withRetry(() => 
    cursor ? pool.query(query, [cursor]) : pool.query(query)
  );
  
  return result.rows;
}

export async function checkDatabaseHealth() {
  await pool.query('SELECT 1');
  return true;
}
