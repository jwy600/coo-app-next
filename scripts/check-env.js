/**
 * Check if environment variables are correctly configured
 * Run in browser console or as a client component
 */

console.log('=== Environment Variables Check ===\n');

// Check Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

console.log('Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n⚠️  WARNING: Environment variables are not set correctly!');
  console.error('This will cause client-side Supabase operations to fail.');
  console.error('\nIn Vercel, ensure you have:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
} else {
  console.log('\n✅ All environment variables are configured correctly!');
}

console.log('\n=== End Check ===');
