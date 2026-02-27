import postgres from 'postgres';

const sql = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require' });

async function run() {
  try {
    // Check if column exists
    const cols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'muscleGroups'
    `;
    if (cols.length === 0) {
      await sql`ALTER TABLE "appointments" ADD COLUMN "muscleGroups" text`;
      console.log('Added muscleGroups column to appointments');
    } else {
      console.log('muscleGroups column already exists');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  await sql.end();
}

run();
