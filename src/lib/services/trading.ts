import { fetchUsersFromDb, checkDatabaseHealth } from "../repositories/trading";

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
  const rows = await fetchUsersFromDb(cursor);

  return rows.map((row) => {
    const totalVolume = Number(row.totalVolume ?? 0);
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      stats: {
        totalVolume,
        buyCount: Number(row.buyCount ?? 0),
        sellCount: Number(row.sellCount ?? 0),
        openTrades: Number(row.openTrades ?? 0),
        closedTrades: Number(row.closedTrades ?? 0),
        latestBalance: Number(row.latestBalance ?? 0),
        riskScore: heavyCalculation(totalVolume),
      },
    };
  });
}

export async function getHealth(): Promise<HealthStatus> {
  try {
    const isUp = await checkDatabaseHealth();
    if (isUp) {
      return {
        status: "UP",
        database: "CONNECTED",
        timestamp: new Date().toISOString(),
      };
    } else {
      throw new Error("Database connectivity issue");
    }
  } catch (error) {
    console.error("Health check error:", error);
    return {
      status: "DOWN",
      database: "DISCONNECTED",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };
  }
}
