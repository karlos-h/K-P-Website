import { supabase } from "./supabase";

// Calls the `am_i_admin()` RPC (migration 021). Only authenticated users can
// invoke it; it returns true/false for the current session only.
export async function checkIsAdmin() {
  const { data, error } = await supabase.rpc("am_i_admin");
  if (error) return false;
  return Boolean(data);
}
