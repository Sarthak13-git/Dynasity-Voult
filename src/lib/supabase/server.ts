import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("gcnvqexnmcgfhnhzvbjd") || key === "placeholder-key") {
    throw new Error(
      "Supabase server client environment variables are missing or using old placeholders. " +
      "If you recently created or edited your .env.local file, you MUST restart your Next.js development server (press Ctrl+C in your terminal, then run: npm run dev) for Next.js to load the new variables."
    );
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url.includes("gcnvqexnmcgfhnhzvbjd") || key === "placeholder-key") {
    throw new Error(
      "Supabase Admin client environment variables (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY) are missing or using old placeholders. " +
      "If you recently created or edited your .env.local file, you MUST restart your Next.js development server (press Ctrl+C in your terminal, then run: npm run dev) for Next.js to load the new variables."
    );
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
