"use server";

import { prisma } from "../lib/prisma";
import { getUsers, UserStats } from "../lib/trading";

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
    // Check database connection using prisma
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date().toISOString(),
    };
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
