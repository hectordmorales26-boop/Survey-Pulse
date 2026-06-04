import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://juirklqnppubdlkxdzaj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '6T2Mqvei@66hr';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
