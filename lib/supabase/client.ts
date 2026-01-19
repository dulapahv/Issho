import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // biome-ignore lint/style/noNonNullAssertion: Environment variables are validated at build time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // biome-ignore lint/style/noNonNullAssertion: Environment variables are validated at build time
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
