import { createClient, type Session } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY;

export const cloudConfigured = Boolean(url && key);

export const supabase = cloudConfigured
  ? createClient(url!, key!, {
      auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: typeof window !== "undefined",
      },
    })
  : null;

export async function getCloudSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
