import { Router, Request, Response } from "express";
import pkg from "@prisma/client";
import { withRetry } from "../utils/db.js";

const router = Router();
const { PrismaClient, Prisma } = pkg;
const prisma = new PrismaClient();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserStats:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *           nullable: true
 *         email:
 *           type: string
 *           nullable: true
 *         stats:
 *           type: object
 *           properties:
 *             totalVolume:
 *               type: number
 *             buyCount:
 *               type: integer
 *             sellCount:
 *               type: integer
 *             openTrades:
 *               type: integer
 *             closedTrades:
 *               type: integer
 *             latestBalance:
 *               type: number
 *             riskScore:
 *               type: number
 */

type UserStats = {
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
    riskScore: number; // heavy calc example
  };
};

const toNumber = (val: Prisma.Decimal | null): number => {
  return val ? Number(val) : 0;
};

// 🔥 Heavier calculation (simulate high CPU load on Node server)
const heavyCalculation = (seed: number): number => {
  let result = seed;

  // Significant CPU work simulation (500,000 iterations per user)
  for (let j = 0; j < 500000; j++) {
    result = Math.sqrt(result * 1.0001 + j);
  }

  return Number(result.toFixed(2));
};

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get users with trading statistics and risk score
 *     description: Fetches a batch of users and calculates their trading stats and a simulated risk score (CPU-intensive).
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination
 *     responses:
 *       200:
 *         description: A list of users with stats
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserStats'
 *       500:
 *         description: Internal server error
 */
router.get('/api/users', async (req: Request, res: Response<UserStats[]>) => {
  const requestStart = Date.now();

  try {
    const LIMIT = 20;
    const cursor = req.query.cursor as string | undefined;

    console.log(`➡️ [${new Date().toISOString()}] Request start (Sub-300ms Target) | cursor: ${cursor}`);

    const dbStart = Date.now();
    // Optimized SQL query using aggregations to hit the 300ms target
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
      ${cursor ? `WHERE u.id > '${cursor}'` : ''} 
      ORDER BY u.id ASC
      LIMIT ${LIMIT};
    `));
    const dbEnd = Date.now();

    if (rawData.length === 0) {
      console.log(`✅ [${new Date().toISOString()}] Finished: No users found`);
      return res.status(200).json([]);
    }

    console.log(`📦 Fetched ${rawData.length} users with aggregations in ${dbEnd - dbStart}ms (DB Time)`);

    const finalResult: UserStats[] = [];
    const nodeStart = Date.now();

    for (const row of rawData) {
      // 🔥 Extremely Heavy CPU work happens HERE (Node side)
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

    const nodeEnd = Date.now();
    const totalTime = Date.now() - requestStart;

    console.log(`✅ [${new Date().toISOString()}] Request Completed:`);
    console.log(` >> DB Server Time (Aggregates): ${dbEnd - dbStart}ms`);
    console.log(` >> Node Server Time (Heavy Calc/Map): ${nodeEnd - nodeStart}ms`);
    console.log(` >> Total Response Time: ${totalTime}ms`);
    const nextCursor = rawData[rawData.length - 1]?.id;
    console.log(` >> NextCursor: ${nextCursor}`);

    return res.status(200).json(finalResult);

  } catch (err) {
    console.error('❌ Error:', err);
    return res.status(500).json([]);
  }
});

export default router;
