/**
 * Test connection with service role key
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

async function testServiceKey() {
  console.log('\n🔑 Testing with Service Role Key...\n');

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    process.exit(1);
  }

  console.log(`URL: ${supabaseUrl}`);
  console.log(`Service Key (first 20 chars): ${serviceKey.substring(0, 20)}...\n`);

  const supabase = createClient(supabaseUrl, serviceKey);

  // Try to query threads
  const { data, error } = await supabase.from('threads').select('*').limit(1);

  if (error) {
    console.log('❌ Error with service key:');
    console.log(`   ${error.message}\n`);
  } else {
    console.log('✅ Service key works!');
    console.log(`   Found ${data.length} thread(s)`);
    console.log('\n💡 This means RLS policies are blocking anonymous access.');
    console.log('   Run the SQL from SUPABASE_SETUP.md to disable RLS.\n');
  }
}

testServiceKey();
