import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Meeting {
  id: string;
  title: string;
  audio_url: string | null;
  transcript: string | null;
  summary: string | null;
  action_items: ActionItem[];
  key_decisions: string[];
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ActionItem {
  task: string;
  assignee: string;
}
