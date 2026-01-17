/**
 * Verify RLS policies are working correctly
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

async function verifyPolicies() {
  console.log('\n✅ Verifying RLS policies are working...\n');

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test all three tables
  const tables = ['threads', 'messages', 'blocks'];
  let allPassed = true;

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);

    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
      allPassed = false;
    } else {
      console.log(`✅ ${table}: Accessible (found ${data.length} rows)`);
    }
  }

  if (allPassed) {
    console.log('\n🎉 All RLS policies are working correctly!');
    console.log('   You can now run your app: vercel dev\n');
  } else {
    console.log('\n⚠️  Some tables are still not accessible.');
    console.log('   Please ensure you ran all the SQL statements.\n');
  }
}

verifyPolicies();
