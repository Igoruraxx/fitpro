import postgres from 'postgres';
const sql = postgres(process.env.SUPABASE_DB_URL);

// Check plan_type enum values
const enums = await sql`
  SELECT e.enumlabel 
  FROM pg_enum e 
  JOIN pg_type t ON e.enumtypid = t.oid 
  WHERE t.typname = 'plan_type'
  ORDER BY e.enumsortorder
`;
console.log("plan_type enum values:", enums.map(e => e.enumlabel).join(', '));

// Check transaction_type enum values
const tenums = await sql`
  SELECT e.enumlabel 
  FROM pg_enum e 
  JOIN pg_type t ON e.enumtypid = t.oid 
  WHERE t.typname = 'transaction_type'
  ORDER BY e.enumsortorder
`;
console.log("transaction_type enum values:", tenums.map(e => e.enumlabel).join(', '));

// Verify transactions columns again
const tcols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' ORDER BY ordinal_position`;
console.log("TRANSACTIONS columns:", tcols.map(c => c.column_name).join(', '));

await sql.end();
