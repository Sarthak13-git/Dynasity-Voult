import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents/[id]/download
 * Securely generate a signed URL (valid for 60 seconds) to download an authenticity document.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;
    const supabase = await createClient();

    // 1. Fetch document and associated artifact
    const { data: document, error: docError } = await supabase
      .from("artifact_documents")
      .select(`
        *,
        artifacts (
          status,
          seller_id
        )
      `)
      .eq("id", docId)
      .maybeSingle();

    if (docError || !document) {
      return NextResponse.json(
        { success: false, error: "Document not found." },
        { status: 404 }
      );
    }

    const artifact = document.artifacts as any;
    if (!artifact) {
      return NextResponse.json(
        { success: false, error: "Associated artifact not found." },
        { status: 404 }
      );
    }

    // 2. Validate permissions
    // Allow download if artifact is available and seller is not suspended. Otherwise, restrict to owner or admin.
    const { data: seller } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", artifact.seller_id)
      .maybeSingle();

    const isPubliclyAvailable = artifact.status === "available" && seller?.status !== "suspended";

    if (!isPubliclyAvailable) {
      // Authenticate session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Authenticated access required for restricted files." },
          { status: 403 }
        );
      }

      // Check role
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isOwner = artifact.seller_id === user.id;
      const isAdmin = callerProfile?.role === "admin";

      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You do not have permission to download this document." },
          { status: 403 }
        );
      }
    }

    // 3. Extract storage path from file_url
    const urlParts = document.file_url.split("artifact-documents/");
    const storagePath = urlParts[urlParts.length - 1];

    if (!storagePath) {
      return NextResponse.json(
        { success: false, error: "Invalid document path in database." },
        { status: 400 }
      );
    }

    // 4. Generate signed URL (expires in 60s)
    const downloadFilename = document.title ? `${document.title.replace(/[^a-zA-Z0-9.-]/g, "_")}.pdf` : "document.pdf";
    const { data, error: signError } = await supabase.storage
      .from("artifact-documents")
      .createSignedUrl(storagePath, 60, {
        download: downloadFilename
      });

    if (signError || !data?.signedUrl) {
      console.error("❌ Storage signed URL generation failed:", signError);
      return NextResponse.json(
        { success: false, error: "Failed to generate secure download link." },
        { status: 500 }
      );
    }

    // 5. Redirect to the signed URL
    return NextResponse.redirect(data.signedUrl);
  } catch (error: any) {
    console.error("❌ Document download endpoint exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
