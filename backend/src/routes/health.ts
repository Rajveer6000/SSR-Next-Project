import { Router } from "express";
import pkg from "@prisma/client";

const router = Router();
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check for the API and Database
 *     responses:
 *       200:
 *         description: API and Database are healthy
 *       500:
 *         description: Either API or Database is unhealthy
 */
router.get("/", async (_req, res) => {
  try {
    // Check database connection using prisma
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "DOWN",
      database: "DISCONNECTED",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
