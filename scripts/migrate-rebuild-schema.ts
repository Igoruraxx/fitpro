#!/usr/bin/env tsx

/**
 * Migration script to rebuild the database schema from scratch
 * This will drop all existing tables and recreate them with RLS policies
 * 
 * WARNING: This will delete all existing data!
 * 
 * Usage: tsx scripts/migrate-rebuild-schema.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("🚀 Starting database schema rebuild...\n");

  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set!");
    console.error("Please set it in your .env file or export it:");
    console.error("  export DATABASE_URL='postgresql://...'");
    process.exit(1);
  }

  console.log("📦 Database URL:", databaseUrl.replace(/:[^:]*@/, ':****@'));

  // Confirm with user before proceeding
  console.log("\n⚠️  WARNING: This will DROP ALL EXISTING TABLES and DATA!");
  console.log("⚠️  This action cannot be undone!\n");
  
  // In a production environment, you would want user confirmation here
  // For automated scripts, we'll proceed

  try {
    // Connect to database
    const client = postgres(databaseUrl, {
      max: 1,
      ssl: process.env.DB_SSL === 'false' ? false : 'require',
    });
    
    const db = drizzle(client);
    console.log("✅ Connected to database\n");

    // Read migration file
    const migrationPath = join(process.cwd(), 'drizzle', 'migrations', '0004_rebuild_schema_from_scratch.sql');
    console.log("📄 Reading migration file:", migrationPath);
    
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    console.log("✅ Migration file loaded\n");

    // Execute migration
    console.log("🔧 Executing migration...");
    console.log("   - Dropping existing tables");
    console.log("   - Creating enums");
    console.log("   - Creating tables with constraints");
    console.log("   - Adding indexes");
    console.log("   - Enabling RLS");
    console.log("   - Creating RLS policies\n");

    // Split SQL by statements and execute
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        await client.unsafe(statement);
        successCount++;
      } catch (error: any) {
        // Some errors are expected (e.g., trying to drop non-existent tables)
        if (!error.message.includes('does not exist') && 
            !error.message.includes('already exists')) {
          console.error("❌ Error executing statement:", error.message);
          errorCount++;
        }
      }
    }

    console.log(`\n✅ Migration completed: ${successCount} statements executed`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} errors encountered (some may be expected)`);
    }

    // Verify tables were created
    console.log("\n🔍 Verifying tables...");
    const result = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log("\n📊 Tables in database:");
    result.forEach((row: any) => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log("\n✅ Database schema rebuild complete!");
    console.log("\n📝 Next steps:");
    console.log("   1. Verify the schema matches your requirements");
    console.log("   2. Run tests to ensure everything works");
    console.log("   3. Create seed data if needed");

    await client.end();
    process.exit(0);

  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  }
}

main();
