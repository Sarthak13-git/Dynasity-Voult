import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/artifacts/[id]/documents
 * Fetch all uploaded documents for a specific artifact.
 * Requires ownership of the artifact or admin permissions.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: artifactId } = await params;
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in." },
        { status: 401 }
      );
    }

    // Authorize role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Verify artifact existence and owner
    const { data: artifact } = await supabase
      .from("artifacts")
      .select("seller_id")
      .eq("id", artifactId)
      .maybeSingle();

    if (!artifact) {
      return NextResponse.json(
        { success: false, error: "Artifact not found" },
        { status: 404 }
      );
    }

    if (artifact.seller_id !== user.id && profile?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Access denied." },
        { status: 403 }
      );
    }

    // Fetch documents
    const { data: documents, error: dbError } = await supabase
      .from("artifact_documents")
      .select("*")
      .eq("artifact_id", artifactId)
      .order("created_at", { ascending: false });

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      documents: documents || [],
    });
  } catch (error: any) {
    console.error("❌ Error fetching documents:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch documents." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/artifacts/[id]/documents
 * Upload a file to storage and record details in the artifact_documents table.
 * Size limit: 10MB. Formats: PDF or images only.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: artifactId } = await params;
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in." },
        { status: 401 }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Verify seller owns the artifact or is admin
    const { data: artifact } = await supabase
      .from("artifacts")
      .select("seller_id")
      .eq("id", artifactId)
      .maybeSingle();

    if (!artifact) {
      return NextResponse.json(
        { success: false, error: "Artifact not found." },
        { status: 404 }
      );
    }

    if (artifact.seller_id !== user.id && profile?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not own this artifact." },
        { status: 403 }
      );
    }

    // Parse formData file
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const documentType = (formData.get("document_type") as string) || "other";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Missing required file parameter." },
        { status: 400 }
      );
    }

    // Validate size: < 20MB
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds the 20MB upload limit." },
        { status: 400 }
      );
    }

    // Validate type: PDF only
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Invalid format. Only PDF files are accepted." },
        { status: 400 }
      );
    }

    const allowedDocTypes = [
      "provenance_record",
      "certificate_of_authenticity",
      "government_approval_certificate",
      "additional_document"
    ];
    if (!allowedDocTypes.includes(documentType)) {
      return NextResponse.json(
        { success: false, error: `Invalid document type: ${documentType}` },
        { status: 400 }
      );
    }

    // Generate unique storage path
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${artifactId}/${Date.now()}-${sanitizedName}`;

    // Upload to Supabase Storage bucket
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("artifact-documents")
      .upload(storagePath, Buffer.from(fileBuffer), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload file to storage." },
        { status: 500 }
      );
    }

    // Retrieve the URL path
    const { data: urlData } = supabase.storage
      .from("artifact-documents")
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;

    const titleParam = formData.get("title") as string;

    // Record inside database table
    const { data: documentRecord, error: dbError } = await supabase
      .from("artifact_documents")
      .insert({
        artifact_id: artifactId,
        document_type: documentType,
        file_url: fileUrl,
        title: titleParam || file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        is_verified: false
      })
      .select()
      .single();

    if (dbError) {
      console.error("❌ Database insert error:", dbError);
      // Cleanup uploaded file from storage
      await supabase.storage.from("artifact-documents").remove([storagePath]);
      return NextResponse.json(
        { success: false, error: "Failed to register document database entry." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      file_url: fileUrl,
      document_id: documentRecord.id,
      document: documentRecord,
    });
  } catch (error: any) {
    console.error("❌ Error in POST documents handler:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/artifacts/[id]/documents
 * Remove a document from the database and storage bucket.
 * Query parameter: ?document_id={uuid}
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: artifactId } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("document_id");

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "Missing document_id query parameter." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in." },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Fetch the document details
    const { data: document, error: docError } = await supabase
      .from("artifact_documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !document) {
      return NextResponse.json(
        { success: false, error: "Document record not found." },
        { status: 404 }
      );
    }

    // Verify artifact owner or admin
    const { data: artifact } = await supabase
      .from("artifacts")
      .select("seller_id")
      .eq("id", artifactId)
      .maybeSingle();

    if (!artifact || (artifact.seller_id !== user.id && profile?.role !== "admin")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Access denied." },
        { status: 403 }
      );
    }

    // Parse out the storage relative file path from the file_url
    const urlParts = document.file_url.split("artifact-documents/");
    const storagePath = urlParts[urlParts.length - 1];

    if (storagePath) {
      const { error: storageDelError } = await supabase.storage
        .from("artifact-documents")
        .remove([storagePath]);

      if (storageDelError) {
        console.error("⚠️ Failed to remove object from storage:", storageDelError);
      }
    }

    // Delete record from database
    const { error: dbDelError } = await supabase
      .from("artifact_documents")
      .delete()
      .eq("id", documentId);

    if (dbDelError) throw dbDelError;

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error: any) {
    console.error("❌ Error deleting document:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
