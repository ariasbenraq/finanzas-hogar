import { Pool } from 'pg';
import { hashPassword } from '../auth/password.js';

async function main() {
  const email = process.env.SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_PASSWORD;
  if (!email || !password || password.length < 12) {
    console.error('Define SEED_EMAIL y SEED_PASSWORD (mínimo 12 caracteres)');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const hash = await hashPassword(password);
  await pool.query(
    `INSERT INTO app.usuarios (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, hash],
  );
  console.log('Usuario listo:', email);
  await pool.end();
}
main();
