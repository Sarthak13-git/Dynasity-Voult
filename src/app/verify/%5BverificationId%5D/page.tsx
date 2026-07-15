import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ShieldCheck, Download, AlertTriangle, FileText, ArrowLeft, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ verificationId: string }>;
}

/**
 * Generate Dynamic SEO Metadata
 */
export async function generateMetadata({ params }: Props) {
  const { verificationId } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("artifact_documents")
    .select(`
      title,
      artifacts (
        title
      )
    `)
    .eq("verification_id", verificationId)
    .maybeSingle();

  if (!doc) {
    return {
      title: "Verification - Certificate Not Found",
    };
  }

  const artifactTitle = (doc.artifacts as any)?.title || "Antiquity Lot";
  return {
    title: `Verify ${verificationId} | ${artifactTitle} | Dynasity-Voult`,
    description: `Official curation authenticity certificate verification details for ${artifactTitle}. ID: ${verificationId}.`,
  };
}

export default async function VerifyCertificatePage({ params }: Props) {
  const { verificationId } = await params;
  const supabase = await createClient();

  // Query database for the verification details
  const { data: doc, error } = await supabase
    .from("artifact_documents")
    .select(`
      *,
      artifacts (
        id,
        title,
        thumbnail_url,
        category,
        seller:profiles!seller_id (
          display_name,
          store_name,
          email
        )
      )
    `)
    .eq("verification_id", verificationId)
    .maybeSingle();

  // If not found in database at all
  if (error || !doc) {
    return (
      <div className="min-h-screen bg-pandora-cream/20 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 border border-red-100">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-serif font-bold text-gray-900 uppercase tracking-wide">Certificate Not Found</h1>
            <p className="text-xs text-gray-500">
              The verification ID <span className="font-mono font-bold text-gray-800">{verificationId}</span> does not match any record in our ledger.
            </p>
          </div>
          <Link
            href="/"
            className="block w-full py-3 bg-pandora-charcoal hover:bg-pandora-gold text-white font-bold uppercase tracking-wider text-xs rounded transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const artifact = doc.artifacts as any;
  const seller = artifact?.seller;
  const sellerName = seller?.store_name || seller?.display_name || "Partner Antiquarian";

  // If is_verified = false but record exists, show revoked state
  const isRevoked = !doc.is_verified;

  // Build current page URL for QR code generation
  // (We target production or local address dynamically)
  const host = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL || "https://dynasity-voult.com" : "";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${host}/verify/${verificationId}`)}`;

  const getDocTypeLabel = (type: string, customTitle: string) => {
    const labels: Record<string, string> = {
      provenance_record: "Provenance Record",
      certificate_of_authenticity: "Certificate of Authenticity",
      government_approval_certificate: "Government Approval Certificate",
      additional_document: customTitle || "Supporting Document",
    };
    return labels[type] || customTitle || "Authenticity File";
  };

  const formatBytes = (bytes: number | null, decimals = 1) => {
    if (!bytes) return "";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-pandora-cream/10 py-16 px-6">
      <div className="mx-auto max-w-3xl bg-white border border-pandora-cream rounded-2xl shadow-xl overflow-hidden">
        {/* Verification Status Header Banner */}
        {isRevoked ? (
          <div className="bg-red-600 text-white text-center py-5 px-6 space-y-1">
            <AlertTriangle className="h-6 w-6 mx-auto" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Certificate Revoked</h2>
            <p className="text-[10px] opacity-80">This authenticity certificate is no longer active.</p>
          </div>
        ) : (
          <div className="bg-emerald-600 text-white text-center py-5 px-6 space-y-1">
            <CheckCircle2 className="h-6 w-6 mx-auto" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Verified Authenticity Certificate</h2>
            <p className="text-[10px] opacity-80">Curation registry verification active.</p>
          </div>
        )}

        {/* Verification Body */}
        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          {/* Left info column */}
          <div className="md:col-span-8 space-y-6">
            <div className="flex items-center gap-3">
              <Link href={`/buy/${artifact?.id}`} className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                <ArrowLeft size={12} /> View Product
              </Link>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-pandora-gold uppercase tracking-wider font-bold block">Official Verification ID</span>
              <h1 className="text-2xl font-mono font-bold text-gray-900">{verificationId}</h1>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block uppercase tracking-wider text-[9px]">Document Title</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">{doc.title}</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase tracking-wider text-[9px]">Document Type</span>
                  <span className="font-bold text-pandora-gold mt-0.5 block">
                    {getDocTypeLabel(doc.document_type, doc.title)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block uppercase tracking-wider text-[9px]">Verification date</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {doc.verified_at ? new Date(doc.verified_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }) : "Pending Review"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase tracking-wider text-[9px]">File size</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">{formatBytes(doc.file_size)} (PDF)</span>
                </div>
              </div>

              {/* Artifact details */}
              <div className="border-t border-gray-100 pt-6 space-y-4">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Antiquity Lot Information</span>
                
                <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                  {artifact?.thumbnail_url && (
                    <div className="relative h-16 w-16 rounded overflow-hidden border border-gray-100 bg-white shrink-0">
                      <img
                        src={artifact.thumbnail_url}
                        alt={artifact.title}
                        className="object-cover h-full w-full"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="font-bold text-gray-900 text-sm block truncate">{artifact?.title}</span>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Category: {artifact?.category}</p>
                    <p className="text-[10px] text-gray-500 truncate">Seller: {sellerName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Document download option */}
            {!isRevoked && (
              <div className="pt-6">
                <a
                  href={`/api/documents/${doc.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-pandora-charcoal hover:bg-pandora-gold text-white font-bold uppercase tracking-wider text-xs rounded transition-colors"
                >
                  <Download size={14} /> Download Authenticity PDF
                </a>
              </div>
            )}
          </div>

          {/* Right QR column */}
          <div className="md:col-span-4 flex flex-col items-center justify-start text-center space-y-6 md:border-l md:border-gray-100 md:pl-8">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold block">Quick verification QR</span>
            
            <div className="border border-pandora-cream p-3 bg-white rounded-xl shadow-sm">
              <img
                src={qrCodeUrl}
                alt="Verification QR code"
                width={150}
                height={150}
                className="mx-auto"
              />
            </div>
            
            <p className="text-[10px] text-gray-400 leading-relaxed max-w-[200px] mx-auto">
              Scan this secure QR code from any device to load this verified certificate details from Dynasity-Voult register.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
