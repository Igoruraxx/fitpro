import postgres from "postgres";
import { config } from "dotenv";
config();

const sql = postgres(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
const cols = await sql`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'bioimpedance_exams' 
  ORDER BY ordinal_position
`;
console.log("bioimpedance_exams columns:", cols.map(c => c.column_name).join(", "));
await sql.end();
