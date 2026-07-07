import { createClient } from "@supabase/supabase-js";

// Fallback values for hosts where setting env vars isn't available (e.g. a
// Netlify plan that gates environment variables). This is safe to commit —
// the Supabase anon key is a public, publishable key by design (see
// https://supabase.com/docs/guides/api/api-keys); it ships in the bundled JS
// either way and is meaningless without Row Level Security, which is what
// actually protects the data (see supabase/migrations 018-022). Prefer the
// env vars when they ARE set, so a proper deployment can still override these.
const FALLBACK_SUPABASE_URL = "https://nmgcvbqampivxxrzfstz.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZ2N2YnFhbXBpdnh4cnpmc3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDc3NzEsImV4cCI6MjA5NzEyMzc3MX0.T0SwQiq0EO6rY5ztqdoq_IBCKBpOou1crPsn_tZgNl8";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Nearly every page reads from Supabase, so a missing/misconfigured env var
// should fail loudly and clearly at the app root (see App.jsx) rather than as
// a cryptic "Cannot read properties of null" crash deep inside some component.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
