import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for TypeScript
export interface Recipe {
  id?: string;
  name: string;
  ingredients: string;
  instructions: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      recipes: {
        Row: Recipe;
        Insert: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
