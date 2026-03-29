"use server";

import {
  getHealth,
  getUsers,
  type HealthStatus,
  type UserStats,
} from "@/lib/services/trading";

export async function fetchUsersAction(cursor?: string): Promise<UserStats[]> {
  try {
    return await getUsers(cursor);
  } catch (error) {
    console.error("Error in fetchUsersAction:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function getHealthAction() {
  try {
    return await getHealth();
  } catch (error) {
    console.error("Health check error:", error);
    return {
      status: "DOWN",
      database: "DISCONNECTED",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    } satisfies HealthStatus;
  }
}
