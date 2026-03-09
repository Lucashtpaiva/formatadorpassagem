import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || ''; // Usually the service_role key to bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
