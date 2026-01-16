import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const loadSupabaseConfig = async () => {
  try {
    const module = await import("../data/supabaseConfig.js");
    return module.default || {};
  } catch (error) {
    return {};
  }
};

export const initSupabase = async () => {
  const config = await loadSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }
  return createClient(config.url, config.anonKey);
};
