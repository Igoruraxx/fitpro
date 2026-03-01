import postgres from 'postgres';
import { config } from 'dotenv';

config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(url);

try {
  const result = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `;
  console.log('=== USERS TABLE SCHEMA ===\n');
  result.forEach(col => {
    console.log(`${col.column_name.padEnd(30)} | ${col.data_type.padEnd(20)} | nullable: ${col.is_nullable} | default: ${col.column_default || 'none'}`);
  });
  await sql.end();
} catch(e) {
  console.error('Error:', e.message);
  process.exit(1);
}
