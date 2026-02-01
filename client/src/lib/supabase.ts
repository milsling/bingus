import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let configPromise: Promise<{ url: string; anonKey: string }> | null = null;

async function getSupabaseConfig(): Promise<{ url: string; anonKey: string }> {
  if (!configPromise) {
    configPromise = fetch('/api/config/supabase')
      .then(res => res.json())
      .catch(() => ({ url: '', anonKey: '' }));
  }
  return configPromise;
}

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (supabaseInstance) return supabaseInstance;
  
  const config = await getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    console.warn('Supabase credentials not configured - realtime features will be disabled');
    return null;
  }
  
  supabaseInstance = createClient(config.url, config.anonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
  
  return supabaseInstance;
}

export async function isSupabaseConfigured(): Promise<boolean> {
  const config = await getSupabaseConfig();
  return !!(config.url && config.anonKey);
}
