import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { PREMIUM_AUCTION_THRESHOLD, PREMIUM_AUCTION_THRESHOLD_LABEL } from "@/lib/constants";
import { createHash } from "crypto";

export interface CreateApplicationBody {
  // Option A: Direct Curation Application for existing artifact
  artifact_id?: string;
  cover_message?: string;

  // Option B: Wizard Curation Application + Artifact creation
  is_wizard?: boolean;
  title?: string;
  category?: string;
  estimated_value?: number;
  starting_bid?: number;
  reserve_price?: number;
  description?: string;
  origin?: string;
  era?: string;
  short_headline?: string;
  provenance?: string;
  ownership_history?: string;
  condition_report?: string;
  historical_period?: string;
  
  // Mandatory media views (base64 data URLs)
  front_image?: string;
  back_image?: string;
  left_image?: string;
  right_image?: string;
  
  // Optional media
  hero_image?: string;
  gallery_images?: string[];
  hero_video?: string;
  model_3d?: string;
  
  // Settings
  start_date?: string;
  start_time?: string;
  duration?: number;
}

interface UploadedMedia {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  hash: string;
}

// Base64 parser, MIME type validator, size checker, and SHA-256 hasher helper
function parseAndValidateBase64(dataUrl: string, label: string, isRichMedia = false): UploadedMedia {
  if (!dataUrl || !dataUrl.startsWith("data:")) {
    throw new Error(`Invalid format for ${label}: Asset must be a valid base64 data URL.`);
  }
  
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error(`Failed to parse base64 payload for ${label}.`);
  }
  
  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  
  // Image limit: 10MB; Video/3D limit: 100MB
  const maxSize = isRichMedia ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  if (buffer.length > maxSize) {
    throw new Error(`Upload size exceeded: ${label} is larger than the maximum size limit of ${isRichMedia ? "100MB" : "10MB"}.`);
  }
  
  let ext = "jpg";
  if (isRichMedia) {
    const allowedRichMimes = ["video/mp4", "video/quicktime", "application/octet-stream", "model/gltf-binary"];
    const extMatch = mimeType.split("/");
    if (!allowedRichMimes.includes(mimeType) && !mimeType.startsWith("model/")) {
      throw new Error(`Invalid format for ${label}. Only MP4, MOV, and GLB/GLTF models are accepted.`);
    }
    ext = mimeType.includes("video") ? (mimeType === "video/quicktime" ? "mov" : "mp4") : "glb";
  } else {
    const allowedImageMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedImageMimes.includes(mimeType)) {
      throw new Error(`Invalid format for ${label}. Only JPG, PNG, and WEBP image formats are accepted.`);
    }
    ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  }
  
  const hash = createHash("sha256").update(buffer).digest("hex");
  
  return { buffer, mimeType, ext, hash };
}

/**
 * GET /api/auction-applications
 * Retrieve applications list (sellers fetch their own, admins fetch all).
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    let query = supabase.from("auction_applications").select(`
      *,
      artifacts:artifact_id (
        id,
        title,
        category,
        estimated_value,
        currency,
        thumbnail_url,
        description,
        origin,
        era
      ),
      profiles:seller_id (
        id,
        display_name,
        email
      )
    `);

    if (profile.role === "seller") {
      query = query.eq("seller_id", user.id);
    } else if (profile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only onboarded sellers can view application logs." },
        { status: 403 }
      );
    }

    const { data: applications, error: dbError } = await query.order("created_at", {
      ascending: false,
    });

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      applications,
    });
  } catch (error: any) {
    console.error("❌ Error fetching auction applications:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auction-applications
 * Submit a new curation proposal. Handles file storage uploading and transaction rollback.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to submit a proposal." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "seller" && profile.role !== "admin")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only onboarding verified sellers can submit proposals." },
        { status: 403 }
      );
    }

    // Rate Limiting Check (Max 1 request per 60 seconds per seller)
    const { data: recentApp } = await supabase
      .from("auction_applications")
      .select("created_at")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentApp) {
      const timeDiff = Date.now() - new Date(recentApp.created_at).getTime();
      const limitWindow = 60 * 1000;
      if (timeDiff < limitWindow) {
        const waitSec = Math.ceil((limitWindow - timeDiff) / 1000);
        return NextResponse.json(
          { success: false, error: `Rate limit exceeded. Please wait ${waitSec} seconds before submitting another application.` },
          { status: 429 }
        );
      }
    }

    const body: CreateApplicationBody = await request.json();

    // ==========================================
    // WIZARD FLOW (Option B)
    // ==========================================
    if (body.is_wizard) {
      const {
        title,
        category,
        estimated_value,
        starting_bid,
        reserve_price,
        description,
        origin,
        era,
        short_headline,
        provenance,
        ownership_history,
        condition_report,
        historical_period,
        
        front_image,
        back_image,
        left_image,
        right_image,
        
        hero_image,
        gallery_images,
        hero_video,
        model_3d,
        
        start_date,
        start_time,
        duration,
        cover_message
      } = body;

      // 1. Wizard field validations
      if (
        !title || !category || !estimated_value || !starting_bid || !description || !origin || !era ||
        !short_headline || !provenance || !ownership_history || !condition_report || !historical_period ||
        !start_date || !start_time || !duration
      ) {
        return NextResponse.json(
          { success: false, error: "Validation failed: Missing required input values. Please complete all fields." },
          { status: 400 }
        );
      }

      // Enforce estimated value constraint (> 0)
      const value = Number(estimated_value);
      if (isNaN(value) || value <= 0) {
        return NextResponse.json(
          { success: false, error: "Validation failed: Estimated value must be greater than 0." },
          { status: 400 }
        );
      }

      // Starting bid validation
      const startBidNum = Number(starting_bid);
      if (isNaN(startBidNum) || startBidNum <= 0) {
        return NextResponse.json(
          { success: false, error: "Validation failed: Requested starting bid must be greater than 0." },
          { status: 400 }
        );
      }

      // Reserve price validation (reserve_price >= starting_bid)
      if (reserve_price !== undefined) {
        const reserveNum = Number(reserve_price);
        if (isNaN(reserveNum) || reserveNum < startBidNum) {
          return NextResponse.json(
            { success: false, error: "Validation failed: Reserve price must be greater than or equal to starting bid." },
            { status: 400 }
          );
        }
      }

      // Duration validation (> 0)
      const durationNum = Number(duration);
      if (isNaN(durationNum) || durationNum <= 0) {
        return NextResponse.json(
          { success: false, error: "Validation failed: Duration must be a positive number of days." },
          { status: 400 }
        );
      }

      // Start time validation (future only)
      const reqStart = new Date(`${start_date}T${start_time}`);
      if (isNaN(reqStart.getTime()) || reqStart.getTime() <= Date.now()) {
        return NextResponse.json(
          { success: false, error: "Validation failed: Curation request start date/time must be in the future." },
          { status: 400 }
        );
      }

      // 2. Validate and parse mandatory image view assets
      if (!front_image || !back_image || !left_image || !right_image) {
        return NextResponse.json(
          { success: false, error: "Validation failed: All 4 mandatory views (Front, Back, Left, Right) are required." },
          { status: 400 }
        );
      }

      // 3. Process base64 data to buffers & validate MIME/size/SHA-256 duplicates
      const parsedAssets: Record<string, UploadedMedia> = {};
      const hashesList: string[] = [];

      const mandatoryEntries = [
        { label: "Front View", payload: front_image, key: "front" },
        { label: "Back View", payload: back_image, key: "back" },
        { label: "Left View", payload: left_image, key: "left" },
        { label: "Right View", payload: right_image, key: "right" }
      ];

      for (const entry of mandatoryEntries) {
        const parsed = parseAndValidateBase64(entry.payload, entry.label);
        if (hashesList.includes(parsed.hash)) {
          return NextResponse.json(
            { success: false, error: `Duplicate file selection: The uploaded file for "${entry.label}" is identical to another selected view.` },
            { status: 400 }
          );
        }
        hashesList.push(parsed.hash);
        parsedAssets[entry.key] = parsed;
      }

      // Validate optional Hero Image
      if (hero_image) {
        const parsed = parseAndValidateBase64(hero_image, "Hero Image");
        if (hashesList.includes(parsed.hash)) {
          return NextResponse.json(
            { success: false, error: "Duplicate file selection: Hero image matches one of the mandatory views." },
            { status: 400 }
          );
        }
        hashesList.push(parsed.hash);
        parsedAssets["hero_image"] = parsed;
      }

      // Validate optional rich assets (video or 3d model)
      if (hero_video) {
        const parsed = parseAndValidateBase64(hero_video, "Hero Video", true);
        if (hashesList.includes(parsed.hash)) {
          return NextResponse.json(
            { success: false, error: "Duplicate file selection: Hero video matches another selected file." },
            { status: 400 }
          );
        }
        hashesList.push(parsed.hash);
        parsedAssets["hero_video"] = parsed;
      } else if (model_3d) {
        const parsed = parseAndValidateBase64(model_3d, "3D Model", true);
        if (hashesList.includes(parsed.hash)) {
          return NextResponse.json(
            { success: false, error: "Duplicate file selection: 3D model matches another selected file." },
            { status: 400 }
          );
        }
        hashesList.push(parsed.hash);
        parsedAssets["model_3d"] = parsed;
      }

      // Validate optional gallery images
      const galleryList: UploadedMedia[] = [];
      if (gallery_images && gallery_images.length > 0) {
        for (let idx = 0; idx < gallery_images.length; idx++) {
          const parsed = parseAndValidateBase64(gallery_images[idx], `Gallery Image ${idx + 1}`);
          if (hashesList.includes(parsed.hash)) {
            return NextResponse.json(
              { success: false, error: `Duplicate file selection: Gallery Image ${idx + 1} matches another selected asset.` },
              { status: 400 }
            );
          }
          hashesList.push(parsed.hash);
          galleryList.push(parsed);
        }
      }

      // 4. Initialize Transaction Safety Trackers
      let createdArtifactId: string | null = null;
      const uploadedStoragePaths: string[] = [];

      // Create Admin Supabase Client for storage bypass and transactional safety deletions
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        }
      );

      try {
        // Generate unique slug for new artifact
        const baseSlug = title
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

        // 5. Upload Assets to public Supabase Storage Bucket first
        const uploadFile = async (asset: UploadedMedia, filename: string): Promise<string> => {
          const storagePath = `${slug}/${Date.now()}-${filename}`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from("artifact-media")
            .upload(storagePath, asset.buffer, {
              contentType: asset.mimeType,
              upsert: true
            });

          if (uploadError) {
            throw new Error(`Failed to upload ${filename} to storage bucket: ${uploadError.message}`);
          }
          
          uploadedStoragePaths.push(storagePath);
          const { data: urlData } = supabaseAdmin.storage
            .from("artifact-media")
            .getPublicUrl(storagePath);
          return urlData.publicUrl;
        };

        // Upload mandatory images
        const frontUrl = await uploadFile(parsedAssets["front"], "front_view.jpg");
        const backUrl = await uploadFile(parsedAssets["back"], "back_view.jpg");
        const leftUrl = await uploadFile(parsedAssets["left"], "left_view.jpg");
        const rightUrl = await uploadFile(parsedAssets["right"], "right_view.jpg");

        // Upload optional assets
        let heroImageUrl: string | null = null;
        if (parsedAssets["hero_image"]) {
          heroImageUrl = await uploadFile(parsedAssets["hero_image"], "hero_image.jpg");
        }

        let heroVideoUrl: string | null = null;
        if (parsedAssets["hero_video"]) {
          heroVideoUrl = await uploadFile(parsedAssets["hero_video"], "hero_video.mp4");
        }

        let model3DUrl: string | null = null;
        if (parsedAssets["model_3d"]) {
          model3DUrl = await uploadFile(parsedAssets["model_3d"], "model_3d.glb");
        }

        const uploadedGalleryUrls: string[] = [];
        for (let i = 0; i < galleryList.length; i++) {
          const url = await uploadFile(galleryList[i], `gallery_${i}.jpg`);
          uploadedGalleryUrls.push(url);
        }

        // 6. Insert new Artifact record
        const imageArrays = [frontUrl, backUrl, leftUrl, rightUrl];
        if (heroImageUrl) imageArrays.unshift(heroImageUrl);
        uploadedGalleryUrls.forEach(url => imageArrays.push(url));

        const { data: newArtifact, error: artError } = await supabaseAdmin
          .from("artifacts")
          .insert({
            title,
            category,
            estimated_value: value,
            buy_now_price: value,
            description,
            origin,
            era,
            short_headline,
            provenance,
            ownership_history,
            condition_report,
            historical_period,
            slug,
            status: "pending_auction_approval",
            images: imageArrays,
            thumbnail_url: frontUrl,
            videos: heroVideoUrl ? [heroVideoUrl] : model3DUrl ? [model3DUrl] : [],
            seller_id: user.id
          })
          .select()
          .single();

        if (artError) {
          throw new Error(`Failed to create database artifact record: ${artError.message}`);
        }

        createdArtifactId = newArtifact.id;

        // 7. Insert normalized media rows
        const mediaRows = [
          { artifact_id: createdArtifactId, media_type: "image", url: frontUrl, view_label: "front", sort_order: 1, is_primary: true },
          { artifact_id: createdArtifactId, media_type: "image", url: backUrl, view_label: "back", sort_order: 2, is_primary: false },
          { artifact_id: createdArtifactId, media_type: "image", url: leftUrl, view_label: "left", sort_order: 3, is_primary: false },
          { artifact_id: createdArtifactId, media_type: "image", url: rightUrl, view_label: "right", sort_order: 4, is_primary: false }
        ];

        if (heroImageUrl) {
          mediaRows.push({ artifact_id: createdArtifactId, media_type: "image", url: heroImageUrl, view_label: "hero", sort_order: 0, is_primary: false });
        }

        if (heroVideoUrl) {
          mediaRows.push({ artifact_id: createdArtifactId, media_type: "video", url: heroVideoUrl, view_label: "hero", sort_order: 0, is_primary: false });
        } else if (model3DUrl) {
          mediaRows.push({ artifact_id: createdArtifactId, media_type: "model_3d", url: model3DUrl, view_label: "hero", sort_order: 0, is_primary: false });
        }

        uploadedGalleryUrls.forEach((url, i) => {
          mediaRows.push({ artifact_id: createdArtifactId!, media_type: "image", url, view_label: "gallery", sort_order: 5 + i, is_primary: false });
        });

        const { error: mediaError } = await supabaseAdmin
          .from("artifact_media")
          .insert(mediaRows);

        if (mediaError) {
          throw new Error(`Failed to save normalized media records: ${mediaError.message}`);
        }

        // 8. Create curation application
        const { data: newApp, error: appError } = await supabaseAdmin
          .from("auction_applications")
          .insert({
            artifact_id: createdArtifactId,
            seller_id: user.id,
            status: "pending",
            admin_comments: cover_message || "Submitted via Curation Wizard Form",
            requested_starting_bid: startBidNum,
            requested_reserve_price: reserve_price ? Number(reserve_price) : null,
            requested_start_time: reqStart.toISOString(),
            requested_duration_days: durationNum
          })
          .select()
          .single();

        if (appError) {
          throw new Error(`Failed to generate live auction curation application: ${appError.message}`);
        }

        return NextResponse.json(
          {
            success: true,
            application_id: newApp.id,
            artifact_id: createdArtifactId,
            message: "Curation wizard proposal submitted successfully."
          },
          { status: 201 }
        );

      } catch (transactionErr: any) {
        console.error("❌ Transaction failed, initiating rollback cleanup sequence:", transactionErr);
        
        // Database Rollback
        if (createdArtifactId) {
          try {
            await supabaseAdmin.from("artifacts").delete().eq("id", createdArtifactId);
            console.log(`[Rollback] Database artifact deleted: ${createdArtifactId}`);
          } catch (dbErr) {
            console.error("[Rollback] Database delete cleanup failed:", dbErr);
          }
        }

        // Storage Rollback
        if (uploadedStoragePaths.length > 0) {
          try {
            const { error: removeErr } = await supabaseAdmin.storage
              .from("artifact-media")
              .remove(uploadedStoragePaths);
            if (removeErr) throw removeErr;
            console.log(`[Rollback] Uploaded files deleted from storage:`, uploadedStoragePaths);
          } catch (storageErr) {
            console.error("[Rollback] Storage deletion cleanup failed:", storageErr);
          }
        }

        throw transactionErr;
      }
    }

    // ==========================================
    // DIRECT APPLICATION FLOW (Option A)
    // ==========================================
    const { artifact_id, cover_message } = body;

    if (!artifact_id) {
      return NextResponse.json(
        { success: false, error: "Missing required field: artifact_id" },
        { status: 400 }
      );
    }

    const { data: artifact, error: artError } = await supabase
      .from("artifacts")
      .select("seller_id, estimated_value, title")
      .eq("id", artifact_id)
      .maybeSingle();

    if (artError || !artifact) {
      return NextResponse.json(
        { success: false, error: "Artifact not found." },
        { status: 404 }
      );
    }

    if (artifact.seller_id !== user.id && profile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not own this artifact." },
        { status: 403 }
      );
    }

    const value = Number(artifact.estimated_value);
    if (isNaN(value) || value < PREMIUM_AUCTION_THRESHOLD) {
      return NextResponse.json(
        {
          success: false,
          error: `Forbidden: Artifact value ($${value.toLocaleString()}) is below the premium auction threshold. Artifacts must be valued at ${PREMIUM_AUCTION_THRESHOLD_LABEL} or greater to list.`
        },
        { status: 403 }
      );
    }

    const { data: existingApplication, error: selectError } = await supabase
      .from("auction_applications")
      .select("id, status")
      .eq("artifact_id", artifact_id)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (selectError) throw selectError;

    if (existingApplication) {
      return NextResponse.json(
        {
          success: false,
          error: `An active auction application already exists for this artifact (Status: ${existingApplication.status}).`
        },
        { status: 400 }
      );
    }

    const { error: updateArtErr } = await supabase
      .from("artifacts")
      .update({ status: "pending_auction_approval" })
      .eq("id", artifact_id);

    if (updateArtErr) throw updateArtErr;

    const { data: newApplication, error: insertError } = await supabase
      .from("auction_applications")
      .insert({
        artifact_id,
        seller_id: user.id,
        status: "pending",
        admin_comments: cover_message || null,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(
      {
        success: true,
        application_id: newApplication.id,
        message: "Application submitted successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ API execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to submit auction application due to request validation issues.",
      },
      { status: 500 }
    );
  }
}
