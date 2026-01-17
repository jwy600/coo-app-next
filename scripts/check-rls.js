/**
 * Check Supabase RLS (Row Level Security) status
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

async function checkRLS() {
  console.log('\n🔒 Checking Row Level Security (RLS) policies...\n');

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

  console.log('Debug - Environment variables:');
  console.log(`  URL: ${supabaseUrl}`);
  console.log(`  Key (first 20 chars): ${supabaseKey?.substring(0, 20)}...`);
  console.log(`  Key length: ${supabaseKey?.length}\n`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Try to query threads
  const { data, error } = await supabase.from('threads').select('*').limit(1);

  if (error) {
    console.log('❌ Error querying threads table:');
    console.log(`   Code: ${error.code}`);
    console.log(`   Message: ${error.message}`);
    console.log(`   Details: ${JSON.stringify(error.details)}\n`);

    if (error.code === 'PGRST301' || error.message.includes('row-level security')) {
      console.log('⚠️  RLS (Row Level Security) is enabled but no policies allow access.\n');
      console.log('📋 To fix this, run the following SQL in Supabase SQL Editor:\n');
      console.log('─'.repeat(60));
      console.log(`-- Disable RLS for development (re-enable in production!)
ALTER TABLE public.threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks DISABLE ROW LEVEL SECURITY;

-- OR create permissive policies for anonymous access:
-- ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations for threads" ON public.threads FOR ALL USING (true);
--
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations for messages" ON public.messages FOR ALL USING (true);
--
-- ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations for blocks" ON public.blocks FOR ALL USING (true);`);
      console.log('─'.repeat(60));
      console.log('\n');
    }
  } else {
    console.log('✅ Successfully queried threads table');
    console.log(`   Found ${data.length} thread(s)\n`);
  }
}

checkRLS();
