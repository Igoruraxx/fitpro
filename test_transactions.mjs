import postgres from "postgres";
const sql = postgres(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
try {
  const rows = await sql`SELECT id, "trainerId", "clientId", type, category, amount, date, "dueDate", "paidAt", status FROM transactions LIMIT 3`;
  console.log("OK - rows:", rows.length);
  if (rows.length > 0) console.log("Sample:", JSON.stringify(rows[0]));
} catch (e) {
  console.error("ERROR:", e.message);
} finally {
  await sql.end();
}
