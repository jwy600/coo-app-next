export default function handler(req, res) {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_PUBLISHABLE_KEY || ''
  });
}
