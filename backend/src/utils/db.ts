import pkg from "@prisma/client";

const { PrismaClient } = pkg;

const prisma = new PrismaClient();

/**
 * Helper to retry a database operation with exponential backoff
 */
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
      // Only retry on network/initialization errors
      const isRetryable = error.message?.includes('Can\'t reach database server') || 
                          error.message?.includes('connection') ||
                          error.name === 'PrismaClientInitializationError';
      
      if (isRetryable && i < retries - 1) {
        console.log(`\n[Retry ${i + 1}/${retries}] Database unreachable. Retrying in ${delay * Math.pow(2, i)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export async function ensureIndexes() {
  console.log('--- Ensuring Database Indexes ---');
  try {
    const queries = [
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_logs_user_id ON portfolio_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_logs_created_at ON portfolio_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_logs_user_created ON portfolio_logs(user_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_trades_covering ON trades(user_id) INCLUDE (total_value, trade_type, status)',
      "CREATE INDEX IF NOT EXISTS idx_trades_open ON trades(user_id) WHERE status = 'open'",
    ];

    for (const query of queries) {
      try {
        process.stdout.write(`Checking/Creating index: ${query}... `);
        await withRetry(() => prisma.$executeRawUnsafe(query));
        console.log('DONE');
      } catch (error: any) {
        // Handle cases where IF NOT EXISTS might still throw a conflict error in some environments
        const isAlreadyExists = 
          (error.code === 'P2010' && error.meta?.code === '23505') || 
          error.message?.includes('already exists');
        
        if (isAlreadyExists) {
          console.log('ALREADY EXISTS (skipped)');
        } else {
          console.log('FAILED');
          throw error;
        }
      }
    }
    console.log('--- All indexes processed successfully ---');
  } catch (error) {
    console.error('\nError ensuring database indexes:', error);
  } finally {
    await prisma.$disconnect();
  }
}
