import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  console.log(`[Callback Route] GET hit with parameters: code=${code ? "PRESENT" : "MISSING"}, type=${type}, next=${next}`);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      console.log(`[Callback Route] exchangeCodeForSession succeeded. type: ${type}, next: ${next}`);
      // Password recovery flow: session established, send to the reset page
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset?mode=recovery`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error(`[Callback Route] exchangeCodeForSession failed:`, error);
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset?error=expired_or_invalid`);
      }
    }
  } else {
    console.warn(`[Callback Route] No code provided. type: ${type}`);
    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/reset?error=expired_or_invalid`);
    }
  }

  // Code missing or exchange failed — send to login with error flag
  return NextResponse.redirect(`${origin}/login?error=callback_failed`);
}

