import { fetchUsersRaw, checkDatabaseHealth } from "../repositories/trading";

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

export type HealthStatus = {
  status: "UP" | "DOWN";
  database: "CONNECTED" | "DISCONNECTED" | string;
  timestamp: string;
  error?: string;
};

const heavyCalculation = (seed = 0) => {
  let result = seed;
  for (let j = 0; j < 500000; j++) {
    result = Math.sqrt(result * 1.0001 + j);
  }
  return Number(result.toFixed(2));
};

export async function getUsers(cursor?: string): Promise<UserStats[]> {
  const requestStart = Date.now();

  try {
    console.log(`➡️ [${new Date().toISOString()}] Request start (Sub-300ms Target) | cursor: ${cursor}`);

    const dbStart = Date.now();
    const rawData = await fetchUsersRaw(cursor);
    const dbEnd = Date.now();

    if (rawData.length === 0) {
      console.log(`✅ [${new Date().toISOString()}] Finished: No users found`);
      return [];
    }

    console.log(`📦 Fetched ${rawData.length} users with aggregations in ${dbEnd - dbStart}ms (DB Time)`);

    const finalResult: UserStats[] = [];
    const nodeStart = Date.now();

    for (const row of rawData) {
      // 🔥 Extremely Heavy CPU work happens HERE (Node side)
      // PG returns numeric as strings! We must explicitly Number() it so Server Actions can serialize numbers.
      const totalVolume = Number(row.totalVolume ?? 0);
      const riskScore = heavyCalculation(totalVolume);

      finalResult.push({
        id: String(row.id),
        name: row.name ? String(row.name) : null,
        email: row.email ? String(row.email) : null,
        stats: {
          totalVolume,
          buyCount: Number(row.buyCount ?? 0),
          sellCount: Number(row.sellCount ?? 0),
          openTrades: Number(row.openTrades ?? 0),
          closedTrades: Number(row.closedTrades ?? 0),
          latestBalance: Number(row.latestBalance ?? 0),
          riskScore,
        },
      });
    }

    const nodeEnd = Date.now();
    const totalTime = Date.now() - requestStart;

    console.log(`✅ [${new Date().toISOString()}] Request Completed:`);
    console.log(` >> DB Server Time (Aggregates): ${dbEnd - dbStart}ms`);
    console.log(` >> Node Server Time (Heavy Calc/Map): ${nodeEnd - nodeStart}ms`);
    console.log(` >> Total Response Time: ${totalTime}ms`);
    const nextCursor = String(rawData[rawData.length - 1]?.id);
    console.log(` >> NextCursor: ${nextCursor}`);

    return finalResult;
  } catch (err) {
    console.error('❌ Error:', err);
    throw err;
  }
}

export async function getHealth(): Promise<HealthStatus> {
  try {
    await checkDatabaseHealth();
    
    return {
      status: 'UP',
      database: 'CONNECTED',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Health check error:', error);
    return {
      status: 'DOWN',
      database: 'DISCONNECTED',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}
