/**
 * Test the anon key directly with Supabase
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

async function testAnonKey() {
  console.log('\n🔑 Testing Anon Key Directly...\n');

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

  console.log('URL:', supabaseUrl);
  console.log('Anon Key (first 50 chars):', anonKey?.substring(0, 50) + '...');
  console.log('Anon Key length:', anonKey?.length);
  console.log('Anon Key has whitespace:', /\s/.test(anonKey || ''));
  console.log('\nTesting with Supabase client...\n');

  const supabase = createClient(supabaseUrl, anonKey);

  // Try a simple query
  const { data, error } = await supabase
    .from('threads')
    .select('id')
    .limit(1);

  if (error) {
    console.log('❌ Query failed:');
    console.log('   Error code:', error.code);
    console.log('   Error message:', error.message);
    console.log('   Error hint:', error.hint);
    console.log('   Error details:', JSON.stringify(error.details));

    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 The anon key appears to be invalid or expired.');
      console.log('   Please get a fresh key from:');
      console.log('   https://app.supabase.com/project/fktrmqmjymoprorudcdr/settings/api');
    } else if (error.code === '42501' || error.message.includes('policy')) {
      console.log('\n💡 RLS policies are blocking access.');
      console.log('   Run this SQL to disable RLS:');
      console.log('');
      console.log('   ALTER TABLE public.threads DISABLE ROW LEVEL SECURITY;');
      console.log('   ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;');
      console.log('   ALTER TABLE public.blocks DISABLE ROW LEVEL SECURITY;');
    }
  } else {
    console.log('✅ Query succeeded!');
    console.log('   Data:', data);
  }

  // Try to insert a test record
  console.log('\n📝 Testing INSERT operation...\n');

  const testId = 'test-' + Date.now();
  const { data: insertData, error: insertError } = await supabase
    .from('threads')
    .insert({
      id: testId,
      title: 'Test Thread',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select();

  if (insertError) {
    console.log('❌ INSERT failed:');
    console.log('   Error code:', insertError.code);
    console.log('   Error message:', insertError.message);
  } else {
    console.log('✅ INSERT succeeded!');
    console.log('   Inserted:', insertData);

    // Clean up
    await supabase.from('threads').delete().eq('id', testId);
    console.log('   (Test record cleaned up)');
  }
}

testAnonKey();
