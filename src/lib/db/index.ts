import { Pool } from 'pg';

// Using a module-scoped pool ensures it is reused across Next.js reloads
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
});

export default pool;
