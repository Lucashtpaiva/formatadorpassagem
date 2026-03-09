import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || ''; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  console.log('Creating table whatsapp_offers_temp...');
  
  // Create table using raw SQL (only works if service_role has permissions, or via REST)
  // Since we cannot run raw DDL from the JS client easily without a stored proc, 
  // users typically run this SQL in the Supabase SQL Editor.
  
  const sql = `
    CREATE TABLE IF NOT EXISTS whatsapp_offers_temp (
      id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
      group_phone TEXT NOT NULL,
      chat_name TEXT,
      msg_type TEXT NOT NULL,
      content TEXT NOT NULL,
      extracted_data JSONB,
      processed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Index for fast lookup
    CREATE INDEX IF NOT EXISTS idx_group_phone_processed ON whatsapp_offers_temp(group_phone, processed);
  `;
  
  console.log('--- PLEASE RUN THE FOLLOWING SQL IN YOUR SUPABASE SQL EDITOR ---');
  console.log(sql);
  console.log('----------------------------------------------------------------');
}

setup();
