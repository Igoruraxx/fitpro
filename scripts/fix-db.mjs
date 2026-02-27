import postgres from 'postgres';

const client = postgres(process.env.SUPABASE_DB_URL, { ssl: 'require' });

async function run() {
  try {
    // Check openId nullable
    const cols = await client`
      SELECT column_name, is_nullable FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'openId'
    `;
    console.log('openId nullable:', cols[0]?.is_nullable);
    
    if (cols[0]?.is_nullable === 'NO') {
      await client`ALTER TABLE users ALTER COLUMN "openId" DROP NOT NULL`;
      console.log('openId is now nullable');
    } else {
      console.log('openId already nullable');
    }
    
    // Fix lastSignedIn default
    await client`ALTER TABLE users ALTER COLUMN "lastSignedIn" SET DEFAULT NOW()`;
    console.log('lastSignedIn default set to NOW()');
    
    // Fix updatedAt default
    await client`ALTER TABLE users ALTER COLUMN "updatedAt" SET DEFAULT NOW()`;
    console.log('updatedAt default set to NOW()');
    
    // Fix createdAt default
    await client`ALTER TABLE users ALTER COLUMN "createdAt" SET DEFAULT NOW()`;
    console.log('createdAt default set to NOW()');
    
    // Test insert
    const test = await client`
      INSERT INTO users (email, "passwordHash", "emailVerified", name, "loginMethod", role, "subscriptionPlan", "subscriptionStatus", "maxClients")
      VALUES ('testscript@fitpro.com', 'hash123', false, 'Test Script', 'email', 'user', 'free', 'trial', 5)
      RETURNING id, email, name
    `;
    console.log('Test insert success:', test[0]);
    
    // Clean up test user
    await client`DELETE FROM users WHERE email = 'testscript@fitpro.com'`;
    console.log('Test user cleaned up');
    
  } catch(e) {
    console.error('Error:', e.message);
    if (e.detail) console.error('Detail:', e.detail);
  }
  
  await client.end();
}

run();
