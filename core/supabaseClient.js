import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const loadSupabaseConfig = async () => {
  // Try loading from static config file first (local dev)
  try {
    const module = await import("../data/supabaseConfig.js");
    if (module.default?.url && module.default?.anonKey) {
      return module.default;
    }
  } catch (error) {
    // Static file not available, fall through to API
  }

  // Fall back to API endpoint (Vercel deployment)
  try {
    const response = await fetch("/api/config");
    const data = await response.json();
    if (data.supabaseUrl && data.supabaseAnonKey) {
      return { url: data.supabaseUrl, anonKey: data.supabaseAnonKey };
    }
  } catch (error) {
    // API not available
  }

  return {};
};

export const initSupabase = async () => {
  const config = await loadSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }
  return createClient(config.url, config.anonKey);
};
