import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export const supabase = env.hasSupabaseConfig
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;
