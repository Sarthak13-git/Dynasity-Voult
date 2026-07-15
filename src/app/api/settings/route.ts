import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings
 * Fetch all platform settings as key-value pairs
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: settings, error } = await supabase
      .from("platform_settings")
      .select("*");

    if (error) throw error;

    // Convert array to key-value object
    const settingsMap: Record<string, any> = {};
    settings?.forEach((row) => {
      try {
        settingsMap[row.key] = JSON.parse(row.value);
      } catch {
        settingsMap[row.key] = row.value; // Fallback to raw string
      }
    });

    // Extract metadata for UI reference
    const metaMap: Record<string, { updated_at: string; updated_by: string | null }> = {};
    settings?.forEach((row) => {
      metaMap[row.key] = {
        updated_at: row.updated_at,
        updated_by: row.updated_by,
      };
    });

    return NextResponse.json({
      success: true,
      settings: settingsMap,
      metadata: metaMap,
    });
  } catch (error: any) {
    console.error("❌ Error fetching platform settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Update settings (admin-only) with validation
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in." },
        { status: 401 }
      );
    }

    // 2. Authorize role = admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admins only." },
        { status: 403 }
      );
    }

    // 3. Parse input settings
    const { settings } = await request.json();
    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid payload: 'settings' object is required." },
        { status: 400 }
      );
    }

    // 4. Validate Settings Parameters
    const errors: string[] = [];

    // Commission Rates validations (0 to 100)
    if (settings.auction_commission_rate !== undefined) {
      const val = Number(settings.auction_commission_rate);
      if (isNaN(val) || val < 0 || val > 100) {
        errors.push("Auction Commission Rate must be a number between 0 and 100.");
      }
    }
    if (settings.direct_sale_commission !== undefined) {
      const val = Number(settings.direct_sale_commission);
      if (isNaN(val) || val < 0 || val > 100) {
        errors.push("Direct Sale Commission must be a number between 0 and 100.");
      }
    }
    if (settings.reserve_price_requirement !== undefined) {
      const val = Number(settings.reserve_price_requirement);
      if (isNaN(val) || val < 0 || val > 100) {
        errors.push("Reserve Price Requirement must be a percentage between 0 and 100.");
      }
    }

    // Fees & Rules positive numbers validations
    if (settings.platform_transaction_fee !== undefined) {
      const val = Number(settings.platform_transaction_fee);
      if (isNaN(val) || val < 0 || val > 999) {
        errors.push("Platform Transaction Fee must be a positive number between 0 and 999.");
      }
    }
    if (settings.min_bid_increment !== undefined) {
      const val = Number(settings.min_bid_increment);
      if (isNaN(val) || val < 0) {
        errors.push("Minimum Bid Increment must be a positive number.");
      }
    }
    if (settings.auction_duration_days !== undefined) {
      const val = Number(settings.auction_duration_days);
      if (isNaN(val) || val <= 0) {
        errors.push("Auction Duration must be a positive number greater than 0.");
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: "Validation failed.", details: errors },
        { status: 400 }
      );
    }

    // 5. Save settings entries to database
    const nowStr = new Date().toISOString();
    
    for (const [key, val] of Object.entries(settings)) {
      const { error: updateError } = await supabase
        .from("platform_settings")
        .update({
          value: JSON.stringify(val),
          updated_by: user.id,
          updated_at: nowStr,
        })
        .eq("key", key);

      if (updateError) {
        console.error(`Error updating settings key "${key}":`, updateError);
        throw new Error(`Failed to update key "${key}"`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Platform settings updated successfully.",
    });
  } catch (error: any) {
    console.error("❌ Error updating platform settings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update settings." },
      { status: 500 }
    );
  }
}
