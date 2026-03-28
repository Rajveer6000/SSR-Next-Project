import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { Worker, isMainThread, workerData, parentPort } from "worker_threads";

dotenv.config({ path: ".env.dev" });

const SYMBOLS = ["BTC", "ETH", "AAPL", "TSLA", "GOOG"];
const TRADE_TYPES = ["buy", "sell"];
const STATUS = ["open", "closed"];

function randomItem(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

// ---------------- WORKER LOGIC ----------------
async function seedBatch(start: number, count: number) {
  const prisma = new PrismaClient();

  for (let i = 0; i < count; i++) {
    const index = start + i;

    const user = await prisma.user.create({
      data: {
        name: `User_${index}`,
        email: `user_${index}@example.com`,
      },
    });

    // Trades (batch insert)
    const trades = [];
    for (let j = 0; j < 100; j++) {
      const quantity = randomNumber(1, 10);
      const price = randomNumber(100, 50000);

      trades.push({
        userId: user.id,
        symbol: randomItem(SYMBOLS),
        tradeType: randomItem(TRADE_TYPES),
        quantity,
        price,
        status: randomItem(STATUS),
        createdAt: new Date(
          Date.now() - Math.floor(Math.random() * 30) * 86400000
        ),
      });
    }

    await prisma.trade.createMany({ data: trades });

    // Portfolio logs
    const logs = [];
    let balance = 100000;

    for (let k = 0; k < 20; k++) {
      balance += randomNumber(-1000, 2000);
      logs.push({
        userId: user.id,
        balance,
        createdAt: new Date(
          Date.now() - Math.floor(Math.random() * 30) * 86400000
        ),
      });
    }

    await prisma.portfolioLog.createMany({ data: logs });

    if (i % 50 === 0) {
      console.log(`Worker ${start}: created ${i} users`);
    }
  }

  await prisma.$disconnect();
  parentPort?.postMessage(`✅ Done batch starting ${start}`);
}

// ---------------- MAIN THREAD ----------------
async function main() {
  const prisma = new PrismaClient();

  console.log("Checking DB connection...");
  await prisma.$queryRaw`SELECT 1`;
  console.log("✅ DB Connected");

  const TOTAL_USERS = 20000;
  const THREADS = 10;

  const batchSize = Math.ceil(TOTAL_USERS / THREADS);

  console.log(`🚀 Seeding ${TOTAL_USERS} users using ${THREADS} threads`);

  const workers: Promise<void>[] = [];

  for (let i = 0; i < THREADS; i++) {
    const start = i * batchSize;
    const count = Math.min(batchSize, TOTAL_USERS - start);

    if (count <= 0) break;

    workers.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { start, count },
        });

        worker.on("message", (msg) => console.log(msg));
        worker.on("error", reject);
        worker.on("exit", (code) => {
          if (code !== 0) reject(new Error(`Worker stopped: ${code}`));
          else resolve();
        });
      })
    );
  }

  await Promise.all(workers);

  console.log("🚀 ALL DONE!");
  await prisma.$disconnect();
}

// ---------------- ENTRY ----------------
if (isMainThread) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  seedBatch(workerData.start, workerData.count);
}