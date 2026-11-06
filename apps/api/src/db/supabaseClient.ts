import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';

/**
 * Supabase Managed Cloud Database & Identity Client
 * Target Project: ggzbyynthvxwkpdbjklf
 * Host: db.ggzbyynthvxwkpdbjklf.supabase.co
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    CONFIG.SUPABASE_URL &&
    (CONFIG.SUPABASE_SERVICE_ROLE_KEY || (CONFIG.SUPABASE_ANON_KEY && !CONFIG.SUPABASE_ANON_KEY.includes('mock')))
  );
};

export const supabase: SupabaseClient = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_SERVICE_ROLE_KEY || CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
