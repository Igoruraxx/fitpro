import postgres from 'postgres';

const client = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require' });

async function run() {
  try {
    // Rename columns to camelCase
    await client`ALTER TABLE auth_tokens RENAME COLUMN userid TO "userId"`;
    console.log('Renamed userid -> userId');
    
    await client`ALTER TABLE auth_tokens RENAME COLUMN expiresat TO "expiresAt"`;
    console.log('Renamed expiresat -> expiresAt');
    
    await client`ALTER TABLE auth_tokens RENAME COLUMN createdat TO "createdAt"`;
    console.log('Renamed createdat -> createdAt');
    
    // Verify
    const cols = await client`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'auth_tokens' 
      ORDER BY ordinal_position
    `;
    console.log('Final columns:', cols.map(c => c.column_name));
    
  } catch(e) {
    console.error('Error:', e.message);
  }
  
  await client.end();
}

run();
