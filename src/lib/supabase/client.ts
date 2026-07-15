import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("gcnvqexnmcgfhnhzvbjd") || key === "placeholder-key") {
    throw new Error(
      "Supabase client environment variables (NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing or using old placeholders. " +
      "If you recently created or edited your .env.local file, you MUST restart your Next.js development server (press Ctrl+C in your terminal, then run: npm run dev) for Next.js to load the new variables."
    );
  }

  return createBrowserClient(url, key);
}
