# Vercel Environment Variable Setup

## Problem

Your Vercel environment variables might be named incorrectly, which would cause client-side Supabase access to fail.

## Required Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables and ensure you have:

### For All Environments (Production, Preview, Development)

```
NEXT_PUBLIC_SUPABASE_URL=https://fktrmqmjymoprorudcdr.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrdHJtcW1qeW1vcHJvcnVkY2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MTUxNDEsImV4cCI6MjA1Mjk5MTE0MX0.EtJ0FZv9XxNNWF6Tc7dDQwvZtD5sZiNEBUVKEwxSzk8
```

### For Server-side Only (Optional)

```
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

## Why NEXT_PUBLIC_ is Required

In Next.js:
- Variables with `NEXT_PUBLIC_` prefix are **exposed to the browser**
- Variables without the prefix are **server-only**

Your Supabase client runs in:
1. **Server components** (loading threads on the server) - can access both
2. **Client components** (hooks, useComposer, etc.) - ONLY sees `NEXT_PUBLIC_*`

## Current Variable Names in Vercel

If you currently have in Vercel:
```
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
```

These will ONLY work on the server, not in the browser. Client-side Supabase calls will fail.

## How to Fix

### Option 1: Add NEXT_PUBLIC_ Prefixed Variables (Recommended)

Add new environment variables in Vercel:
1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add `NEXT_PUBLIC_SUPABASE_URL` with your Supabase URL
3. Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with your anon key
4. Keep the old `SUPABASE_*` variables for backward compatibility
5. Redeploy your app

### Option 2: Rename Existing Variables

1. Delete `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Redeploy

## Verify Variables Are Set

After deploying, you can verify in the browser console:
```javascript
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
```

If these show `undefined`, the variables aren't set correctly in Vercel.

## Testing Locally

Your `.env.local` is already correct with both prefixed and unprefixed versions. This is why it works locally but might fail in Vercel.
