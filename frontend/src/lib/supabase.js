import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Nearly every page reads from Supabase, so a missing/misconfigured env var
// should fail loudly and clearly at the app root (see App.jsx) rather than as
// a cryptic "Cannot read properties of null" crash deep inside some component.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
