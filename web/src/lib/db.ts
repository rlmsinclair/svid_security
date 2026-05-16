import { Pool } from 'pg';

const globalPool = global as typeof global & { _pgPool?: Pool };

if (!globalPool._pgPool) {
  globalPool._pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
}

const pool = globalPool._pgPool;
export default pool;
