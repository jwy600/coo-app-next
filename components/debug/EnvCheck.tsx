/**
 * Debug component to check environment variables
 * Add this to your landing page temporarily to verify Vercel env vars
 */

'use client';

export function EnvCheck() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#f0f0f0',
      border: '2px solid #333',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        Env Vars Check
      </div>
      <div>
        SUPABASE_URL: {supabaseUrl ? '✅' : '❌'}
      </div>
      <div>
        SUPABASE_KEY: {supabaseKey ? '✅' : '❌'}
      </div>
      {(!supabaseUrl || !supabaseKey) && (
        <div style={{ color: 'red', marginTop: '5px' }}>
          ⚠️ Check VERCEL_ENV_SETUP.md
        </div>
      )}
    </div>
  );
}
