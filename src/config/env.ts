const defaultSupabaseUrl = "https://oaspvvummczhcawzlfua.supabase.co";
const defaultSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hc3B2dnVtbWN6aGNhd3psZnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTE0NzgsImV4cCI6MjA5MTE2NzQ3OH0.7o2GuC1MOEmtG5UY95v4u0H2JkKaUdIjT67JTVI_wT0";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  hasSupabaseConfig: Boolean(supabaseUrl && supabaseAnonKey)
};
