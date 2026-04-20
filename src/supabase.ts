// Re-export depuis lib/supabase pour éviter les clients non isolés
export { supabaseDG as supabase, supabaseDG, supabaseStaff, getActiveSupabaseClient } from './lib/supabase';