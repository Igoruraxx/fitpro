import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) throw new Error("No DATABASE_URL");

const client = postgres(connectionString, { ssl: "require" });
const db = drizzle(client);

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "bioimpedanceExams" (
    "id" SERIAL PRIMARY KEY,
    "trainerId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "weight" DECIMAL(6,2),
    "muscleMass" DECIMAL(6,2),
    "musclePct" DECIMAL(5,2),
    "bodyFatPct" DECIMAL(5,2),
    "visceralFat" DECIMAL(5,1),
    "perimetria" TEXT,
    "dobras" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

console.log("✅ bioimpedanceExams table created/verified");
await client.end();
