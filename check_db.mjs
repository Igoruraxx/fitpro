import postgres from 'postgres';

const sql = postgres(process.env.SUPABASE_DB_URL);
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'clients' ORDER BY ordinal_position`;
console.log("CLIENTS columns:", cols.map(c => c.column_name).join(', '));

const tcols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' ORDER BY ordinal_position`;
console.log("TRANSACTIONS columns:", tcols.map(c => c.column_name).join(', '));

await sql.end();
