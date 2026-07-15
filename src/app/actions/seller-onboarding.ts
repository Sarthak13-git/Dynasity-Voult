"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface UpgradeResponse {
  success: boolean;
  error?: string;
}

/**
 * Server action to securely upgrade a standard user profile to the "seller" role.
 * Bypasses the client-side database trigger role restriction by utilizing the 
 * service role admin client on the server.
 * 
 * @param formData FormData containing storeName, storeDescription, phone, bankAccount, and taxId
 */
export async function upgradeToSellerRole(formData: FormData): Promise<UpgradeResponse> {
  try {
    // 1. Extract and validate input fields
    const storeName = formData.get("storeName") as string;
    const storeDescription = (formData.get("storeDescription") as string) || "";
    const phone = formData.get("phone") as string;
    const bankAccount = formData.get("bankAccount") as string;
    const taxId = formData.get("taxId") as string;

    if (!storeName || !phone || !bankAccount || !taxId) {
      return {
        success: false,
        error: "Missing required fields. Please fill in all required inputs.",
      };
    }

    // 2. Authenticate the active user session
    const supabaseClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Unauthorized: You must be signed in to complete onboarding.",
      };
    }

    // 3. Initialize the admin client to update security-sensitive fields (bypassing triggers)
    const adminClient = await createAdminClient();

    const { data: updatedProfile, error: updateError } = await adminClient
      .from("profiles")
      .update({
        store_name: storeName.trim(),
        store_description: storeDescription.trim(),
        phone: phone.trim(),
        bank_account: bankAccount.trim(),
        tax_id: taxId.trim(),
        role: "seller",
      })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating profile with service role:", updateError);

      // Handle common Postgres constraint errors (e.g. uniqueness conflicts)
      if (updateError.code === "23505") {
        const errMsg = (updateError.message || "") + " " + (updateError.details || "");
        if (errMsg.includes("store_name")) {
          return {
            success: false,
            error: "This store name is already registered to another seller.",
          };
        }
        if (errMsg.includes("phone")) {
          return {
            success: false,
            error: "This phone number is already registered to another account.",
          };
        }
      }

      return {
        success: false,
        error: updateError.message || "Failed to update profile values.",
      };
    }

    console.log(`✅ Successfully upgraded profile ${user.id} to seller role:`, updatedProfile);

    return {
      success: true,
    };
  } catch (err: any) {
    console.error("❌ Unexpected error in upgradeToSellerRole:", err);
    return {
      success: false,
      error: err.message || "An unexpected error occurred during onboarding.",
    };
  }
}
