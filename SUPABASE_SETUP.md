# Supabase Setup Guide

## Issue: Invalid API Key Error

You're seeing "Invalid API key" errors because the Supabase credentials in `.env.local` might be outdated or incorrect.

## Steps to Fix

### 1. Get Fresh API Credentials

1. Go to your Supabase project dashboard:
   - https://app.supabase.com/project/fktrmqmjymoprorudcdr

2. Click on **Settings** (gear icon) in the left sidebar

3. Click on **API** in the settings menu

4. Find these two values:
   - **Project URL** (under "Configuration" section)
   - **anon/public key** (under "Project API keys" section)

### 2. Update `.env.local`

Replace the values in your `.env.local` file:

```bash
# Supabase configuration (for client-side access)
NEXT_PUBLIC_SUPABASE_URL=<your_project_url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your_anon_key>

# Legacy variables (kept for backward compatibility)
SUPABASE_URL=<your_project_url>
SUPABASE_PUBLISHABLE_KEY=<your_anon_key>
```

### 3. Ensure Row Level Security is Disabled (for Development)

1. Go to SQL Editor: https://app.supabase.com/project/fktrmqmjymoprorudcdr/sql/new

2. Run this SQL to disable RLS for development:

\`\`\`sql
-- Disable RLS for development (re-enable in production!)
ALTER TABLE public.threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks DISABLE ROW LEVEL SECURITY;
\`\`\`

**Note:** In production, you should enable RLS and create proper policies. For development, disabling RLS makes testing easier.

### 4. Verify Database Setup

Run the verification script:

\`\`\`bash
node scripts/setup-db.js
\`\`\`

You should see:
```
✓ Table "threads" exists
✓ Table "messages" exists
✓ Table "blocks" exists

✅ All database tables are properly configured!
```

### 5. Test API Connection

Run the RLS check script:

\`\`\`bash
node scripts/check-rls.js
\`\`\`

You should see:
```
✅ Successfully queried threads table
```

### 6. Restart Development Server

After updating `.env.local`, restart your development server:

\`\`\`bash
# Stop the current server (Ctrl+C)
# Then start again:
vercel dev
\`\`\`

## Alternative: Use Service Role Key (Development Only)

If you're still having issues, you can use the service role key for local development:

1. Get the **service_role key** from the API settings (⚠️ never expose this in production!)

2. Update `lib/supabase/client.ts` to use service role in development:

\`\`\`typescript
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
                    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
                    process.env.SUPABASE_PUBLISHABLE_KEY;
\`\`\`

This bypasses RLS entirely (service role has full access).

## Still Having Issues?

If you're still seeing errors, please share:
1. The exact error message from the console
2. Screenshot of your Supabase API settings page (hide the keys)
3. Output from `node scripts/check-rls.js`
