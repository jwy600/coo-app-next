/**
 * Database Setup Verification Script
 *
 * This script checks if your Supabase database is properly configured.
 * If tables don't exist, it provides instructions for manual setup.
 *
 * Run with: node scripts/setup-db.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Manually load .env.local
function loadEnv() {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

const env = loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function verifyDatabase() {
  console.log('\n🔍 Verifying Supabase database setup...\n');

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration in .env.local');
    console.error('   Required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
  }

  console.log(`✓ Supabase URL configured: ${supabaseUrl}\n`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check each required table
  const tables = ['threads', 'messages', 'blocks'];
  let allTablesExist = true;

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1);

      if (error) {
        if (error.message.includes('does not exist') || error.code === 'PGRST204') {
          console.log(`❌ Table "${table}" does not exist`);
          allTablesExist = false;
        } else {
          console.log(`✓ Table "${table}" exists`);
        }
      } else {
        console.log(`✓ Table "${table}" exists`);
      }
    } catch (err) {
      console.log(`❌ Table "${table}" check failed: ${err.message}`);
      allTablesExist = false;
    }
  }

  if (!allTablesExist) {
    const schemaPath = join(__dirname, '..', 'legacy', 'supabase', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    console.log('\n⚠️  Database tables are missing!\n');
    console.log('📋 To set up your database, follow these steps:\n');
    console.log('1. Go to your Supabase project SQL Editor:');
    console.log(`   https://app.supabase.com/project/_/sql/new\n`);
    console.log('2. Copy the SQL below and paste it into the editor:\n');
    console.log('─'.repeat(60));
    console.log(schema);
    console.log('─'.repeat(60));
    console.log('\n3. Click "Run" to execute the SQL\n');
    console.log('4. Re-run this script to verify: node scripts/setup-db.js\n');
    process.exit(1);
  }

  console.log('\n✅ All database tables are properly configured!\n');
  console.log('You can now run your application with: vercel dev\n');
}

verifyDatabase();
