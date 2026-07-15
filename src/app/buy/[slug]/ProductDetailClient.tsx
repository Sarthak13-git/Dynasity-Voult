"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Clock, Heart, Share2, ZoomIn, ZoomOut, X,
  Copy, Mail, Facebook, Twitter, ShieldCheck,
  ChevronLeft, ChevronRight, ShoppingBag
} from "lucide-react";

interface ProductDetailClientProps {
  artifact: any;
  isFavorited: boolean;
  relatedProducts: any[];
  userId: string | null;
  documents?: any[];
  provenance?: any[];
}

export default function ProductDetailClient({
  artifact,
  isFavorited,
  relatedProducts,
  userId,
  documents = [],
  provenance = [],
}: ProductDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(false);
  const [favoriteState, setFavoriteState] = useState(isFavorited);
  const [favLoading, setFavLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const imagesList = useMemo(() => {
    if (artifact.images && artifact.images.length > 0) return artifact.images;
    return [artifact.thumbnail_url || "/buy/item-1.jpg"];
  }, [artifact]);

  // Gallery keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === "Escape") {
          setLightboxOpen(false);
          setLightboxZoom(false);
        } else if (e.key === "ArrowLeft") {
          setActiveImageIndex(prev => prev === 0 ? imagesList.length - 1 : prev - 1);
        } else if (e.key === "ArrowRight") {
          setActiveImageIndex(prev => (prev + 1) % imagesList.length);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, imagesList.length]);

  // Swipe controls
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left -> Next image
        setActiveImageIndex(prev => (prev + 1) % imagesList.length);
      } else {
        // Swipe right -> Prev image
        setActiveImageIndex(prev => prev === 0 ? imagesList.length - 1 : prev - 1);
      }
    }
    setTouchStart(null);
  };

  const handleFavoriteToggle = async () => {
    if (!userId) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setFavLoading(true);
    try {
      if (favoriteState) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("artifact_id", artifact.id);
        if (error) throw error;
        setFavoriteState(false);
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: userId, artifact_id: artifact.id });
        if (error) throw error;
        setFavoriteState(true);
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    } finally {
      setFavLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!userId) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifact_id: artifact.id }),
      });
      const data = await res.json();
      if (data.success && data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        alert(data.error || "Failed to initiate checkout");
      }
    } catch (err) {
      console.error(err);
      alert("Error initiating checkout session");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const shareText = `Explore "${artifact.title}" on Dynasity-Voult`;
  const shareLinks = {
    email: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`,
  };

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-pandora-ivory pb-20">
      {/* ─── BREADCRUMBS ─── */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 pt-8">
        <Link
          href="/buy"
          className="text-xs font-semibold uppercase tracking-wider text-pandora-gray hover:text-pandora-gold transition-colors flex items-center gap-1.5"
        >
          <ChevronLeft size={14} />
          <span>Back to Collection</span>
        </Link>
      </div>

      {/* ─── MAIN DETAIL WORKSPACE ─── */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* ──── LEFT PANEL: GALLERY & DETAILS (8 cols) ──── */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Gallery Wrapper */}
            <div className="space-y-4 max-w-[72%] md:max-w-[75%]">
              <div 
                className="relative aspect-[4/3] w-full overflow-hidden bg-pandora-cream border border-pandora-cream cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <Image
                  src={imagesList[activeImageIndex]}
                  alt={artifact.title}
                  fill
                  priority
                  className="object-cover transition-transform duration-700 hover:scale-[1.02]"
                  sizes="(max-width: 1024px) 100vw, 65vw"
                />

                {/* Primary zoom trigger indicator */}
                <div className="absolute bottom-4 right-4 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm shadow pointer-events-none">
                  <ZoomIn size={16} />
                </div>
              </div>

              {/* Slider Thumbnails Indicators */}
              {imagesList.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {imagesList.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative h-20 w-20 shrink-0 border overflow-hidden transition-all duration-300 cursor-pointer ${
                        activeImageIndex === idx ? "border-pandora-gold" : "border-pandora-cream opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={img}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title / Description */}
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-pandora-gold block mb-2">
                  {artifact.category}
                </p>
                <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-wide text-pandora-charcoal">
                  {artifact.title}
                </h1>
                {artifact.short_headline && (
                  <p className="mt-3 font-serif text-xl italic text-pandora-gray leading-relaxed">
                    {artifact.short_headline}
                  </p>
                )}
              </div>

              <div className="h-px bg-pandora-cream w-full" />

              {/* Description Content */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-pandora-charcoal">
                  Curation Overview
                </h3>
                <p className="text-sm text-pandora-gray leading-relaxed text-justify">
                  {artifact.description}
                </p>
              </div>

              {/* Artifact Digital Passport */}
              <div className="bg-white border border-pandora-cream rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪪</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-pandora-gold">
                    Artifact Digital Passport
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="border border-pandora-cream/40 rounded p-3">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Origin / Region</span>
                    <span className="font-semibold text-pandora-charcoal mt-1 block">{artifact.origin || "N/A"}</span>
                  </div>
                  <div className="border border-pandora-cream/40 rounded p-3">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Historical Era</span>
                    <span className="font-semibold text-pandora-charcoal mt-1 block">{artifact.era || "N/A"}</span>
                  </div>
                  <div className="border border-pandora-cream/40 rounded p-3">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Verification ID</span>
                    <span className="font-mono font-bold text-pandora-gold mt-1 block">
                      {documents.find(d => d.is_verified && d.verification_id)?.verification_id || "DV-PENDING"}
                    </span>
                  </div>
                  <div className="border border-pandora-cream/40 rounded p-3">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Document Catalog</span>
                    <span className="font-semibold text-pandora-charcoal mt-1 block">{documents.length} Files</span>
                  </div>
                  <div className="border border-pandora-cream/40 rounded p-3">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Earliest Record</span>
                    <span className="font-semibold text-pandora-charcoal mt-1 block">
                      {provenance.length > 0 && provenance[0].event_date 
                        ? new Date(provenance[0].event_date).getFullYear() 
                        : "N/A"}
                    </span>
                  </div>
                  <div className="border border-pandora-cream/40 rounded p-3 col-span-2 md:col-span-3">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Curation Last Updated</span>
                    <span className="font-semibold text-pandora-charcoal mt-1 block">
                      {new Date(artifact.updated_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Artifact Timeline & Historical Journey */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏳</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-pandora-gold">
                    Artifact Provenance Timeline
                  </h3>
                </div>

                {/* Historical Journey Summary Paragraph */}
                <div className="bg-amber-50/40 border border-pandora-cream rounded-xl p-5 text-xs text-pandora-gray leading-relaxed">
                  <span className="font-bold text-pandora-charcoal uppercase tracking-wider text-[9px] block mb-1.5">Historical Journey</span>
                  <p className="italic text-justify">
                    {provenance.length > 0 ? (
                      `The historical journey of this artifact spans across multiple events: it was first recorded during "${provenance[0].title}"${provenance[0].location ? ` in ${provenance[0].location}` : ""} (${provenance[0].event_date ? new Date(provenance[0].event_date).getFullYear() : "unknown date"}). Subsequently, it transitioned through key periods, including: ${provenance.slice(1).map(evt => `"${evt.title}"${evt.location ? ` in ${evt.location}` : ""} (${evt.event_date ? new Date(evt.event_date).getFullYear() : "unknown date"})`).join("; and ")}.`
                    ) : (
                      `No active digital timeline records exist yet for this lot. Provenance is supported by seller-provided documentation.`
                    )}
                  </p>
                </div>

                {provenance.length > 0 && (
                  <div className="relative border-l-2 border-pandora-gold/30 pl-8 ml-4 py-2 space-y-8">
                    {provenance.map((evt: any, idx: number) => {
                      const eventYear = evt.event_date ? new Date(evt.event_date).getFullYear() : "Era";

                      return (
                        <div key={evt.id || idx} className="relative group">
                          {/* Timeline Node dot marker */}
                          <span className="absolute -left-[41px] top-1.5 h-5 w-5 rounded-full border-4 border-white bg-pandora-gold group-hover:scale-125 transition-transform duration-300 shadow-xs" />
                          
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-serif font-bold text-base text-pandora-gold">{eventYear}</span>
                              {evt.location && (
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                  📍 {evt.location}
                                </span>
                              )}
                            </div>
                            
                            <h4 className="font-serif font-bold text-sm text-pandora-charcoal">{evt.title}</h4>
                            {evt.description && <p className="text-xs text-pandora-gray leading-relaxed text-justify max-w-2xl">{evt.description}</p>}
                            
                            {evt.document_id && (
                              <div className="pt-1.5">
                                <a
                                  href={`/api/documents/${evt.document_id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[10px] text-pandora-gold hover:text-pandora-gold-light font-bold uppercase tracking-wider"
                                >
                                  📄 View Supporting Document
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Technical Specifications details block */}
              <div className="grid gap-6 md:grid-cols-2 pt-6">
                
                {artifact.historical_period && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Historical Period</span>
                    <p className="text-xs font-semibold text-pandora-charcoal bg-white border border-pandora-cream rounded px-3.5 py-2.5">
                      {artifact.historical_period}
                    </p>
                  </div>
                )}

                {artifact.condition_report && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Condition Report</span>
                    <p className="text-xs text-pandora-gray bg-white border border-pandora-cream rounded px-3.5 py-2.5 leading-relaxed">
                      {artifact.condition_report}
                    </p>
                  </div>
                )}

                {artifact.ownership_history && (
                  <div className="space-y-2 md:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Ownership Registry</span>
                    <p className="text-xs text-pandora-gray bg-white border border-pandora-cream rounded px-3.5 py-2.5 leading-relaxed">
                      {artifact.ownership_history}
                    </p>
                  </div>
                )}

              </div>

            </div>

            {/* Seller profile block */}
            <div className="bg-white border border-pandora-cream rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-full border border-pandora-cream bg-pandora-ivory flex-shrink-0 flex items-center justify-center">
                  {artifact.seller?.avatar_url ? (
                    <Image src={artifact.seller.avatar_url} alt="" fill className="object-cover" />
                  ) : (
                    <span className="font-serif text-xl font-medium text-pandora-gray">
                      {(artifact.seller?.store_name || artifact.seller?.display_name || "S")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Sold by</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-serif text-lg font-medium text-pandora-charcoal block">
                      {artifact.seller?.store_name || artifact.seller?.display_name || "Verified Heritage Dealer"}
                    </span>
                    {artifact.seller?.status === "active" && (
                      <span className="rounded bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                        Verified
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-pandora-gray block mt-0.5">{artifact.seller?.email}</span>
                </div>
              </div>
              
              {artifact.seller?.store_name && (
                <Link
                  href={`/seller/${artifact.seller.store_name
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "")}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded border border-pandora-gold px-4 py-2 text-xs font-semibold text-pandora-gold hover:bg-pandora-gold hover:text-white transition-all cursor-pointer uppercase tracking-wider"
                >
                  View Store →
                </Link>
              )}
            </div>

          </div>

          {/* ──── RIGHT PANEL: STICKY BUY SIDEBAR (4 cols) ──── */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              
              {/* Purchase Box */}
              <div className="bg-white border border-pandora-cream rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
                
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-pandora-gray block">Acquisition Value</span>
                  <span className="font-serif text-3xl font-bold text-pandora-charcoal mt-1.5 block">
                    {artifact.buy_now_price ? formatPrice(Number(artifact.buy_now_price)) : "Price on Request"}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Estimated Appraisal: {artifact.estimated_value ? formatPrice(Number(artifact.estimated_value)) : "Upon Request"}
                  </span>
                </div>

                <div className="h-px bg-pandora-cream w-full" />

                {/* Purchase Button */}
                {artifact.status === "available" ? (
                  <button
                    onClick={handleBuyNow}
                    disabled={checkoutLoading || !artifact.buy_now_price}
                    className="w-full py-4 bg-pandora-charcoal hover:bg-pandora-gold text-white text-center font-bold text-xs uppercase tracking-widest rounded transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow"
                  >
                    {checkoutLoading ? (
                      "Redirecting..."
                    ) : (
                      <>
                        <ShoppingBag size={14} />
                        Buy Now / Acquire
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-4 bg-white/10 text-white/40 text-center font-bold text-xs uppercase tracking-widest rounded cursor-not-allowed border border-pandora-cream"
                  >
                    Item Acquired (Sold)
                  </button>
                )}

                {/* Favorite & Share Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleFavoriteToggle}
                    disabled={favLoading}
                    className="flex-1 py-3 border border-pandora-cream rounded flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-pandora-gray hover:border-pandora-gold hover:text-pandora-gold transition-colors cursor-pointer"
                  >
                    <Heart
                      size={14}
                      fill={favoriteState ? "#ef4444" : "none"}
                      className={favoriteState ? "text-red-500" : ""}
                    />
                    {favoriteState ? "Favorited" : "Favorite"}
                  </button>

                  <div className="relative flex-1">
                    <button
                      onClick={() => setShareMenuOpen(!shareMenuOpen)}
                      className="w-full py-3 border border-pandora-cream rounded flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-pandora-gray hover:border-pandora-gold hover:text-pandora-gold transition-colors cursor-pointer"
                    >
                      <Share2 size={14} />
                      Share
                    </button>

                    {shareMenuOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-pandora-cream rounded-md shadow-lg p-2 z-30 flex flex-col gap-1">
                        <button
                          onClick={handleCopyLink}
                          className="w-full text-left px-3 py-2 text-xs text-pandora-gray hover:bg-pandora-ivory flex items-center gap-2 rounded cursor-pointer"
                        >
                          <Copy size={12} />
                          {copyFeedback ? "Copied!" : "Copy Link"}
                        </button>
                        <a
                          href={shareLinks.email}
                          className="w-full text-left px-3 py-2 text-xs text-pandora-gray hover:bg-pandora-ivory flex items-center gap-2 rounded cursor-pointer"
                        >
                          <Mail size={12} />
                          Email Share
                        </a>
                        <a
                          href={shareLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-left px-3 py-2 text-xs text-pandora-gray hover:bg-pandora-ivory flex items-center gap-2 rounded cursor-pointer"
                        >
                          <Twitter size={12} />
                          Twitter Share
                        </a>
                        <a
                          href={shareLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-left px-3 py-2 text-xs text-pandora-gray hover:bg-pandora-ivory flex items-center gap-2 rounded cursor-pointer"
                        >
                          <Facebook size={12} />
                          Facebook Share
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Verified Documentation Panel */}
              <div className="bg-white/5 border border-pandora-cream rounded-xl p-5 space-y-6 text-xs leading-relaxed text-pandora-gray">
                <div className="flex gap-3">
                  <ShieldCheck size={20} className="text-pandora-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-pandora-charcoal block mb-0.5 uppercase tracking-wider text-[10px]">Verified Documentation</span>
                    Every listed document has been uploaded by the seller and reviewed by Dynasity-Voult before publication.
                  </div>
                </div>

                <div className="pt-4 border-t border-pandora-cream/40 space-y-4">
                  <span className="font-bold text-pandora-charcoal block uppercase tracking-wider text-[10px]">Verified Documents</span>
                  
                  {documents.length === 0 ? (
                    <p className="text-xs text-pandora-gray italic">Verification documents unavailable.</p>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => {
                        const typeLabels: Record<string, string> = {
                          provenance_record: "Provenance Record",
                          certificate_of_authenticity: "Certificate of Authenticity",
                          government_approval_certificate: "Government Approval Certificate",
                          additional_document: doc.title || "Additional Document",
                        };

                        const displayTitle = doc.document_type === "additional_document" 
                          ? (doc.title || "Additional Document")
                          : (typeLabels[doc.document_type] || doc.title || "Authenticity File");

                        const displayTypeLabel = doc.document_type === "additional_document" 
                          ? "Supporting Document" 
                          : (typeLabels[doc.document_type] || "Authenticity File");

                        const displayDate = new Date(doc.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });

                        const formatBytes = (bytes: number, decimals = 1) => {
                          if (!bytes) return "";
                          const k = 1024;
                          const dm = decimals < 0 ? 0 : decimals;
                          const sizes = ["Bytes", "KB", "MB", "GB"];
                          const i = Math.floor(Math.log(bytes) / Math.log(k));
                          return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
                        };

                        return (
                          <div key={doc.id} className="bg-white border border-pandora-cream rounded-lg p-4 flex flex-col justify-between gap-3 text-xs shadow-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <span className="text-lg flex-shrink-0">📄</span>
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-pandora-charcoal block font-serif text-[13px] truncate" title={displayTitle}>{displayTitle}</span>
                                  <span className="text-[10px] text-pandora-gold font-medium block mt-0.5">{displayTypeLabel}</span>
                                </div>
                              </div>
                              {doc.is_verified ? (
                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex-shrink-0">
                                  Verified ✓
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex-shrink-0">
                                  Pending Review
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-pandora-cream/30 text-[10px] text-gray-500 gap-4">
                              <div className="min-w-0">
                                <span className="block truncate">Uploaded: {displayDate}</span>
                                {doc.file_size && <span className="block mt-0.5">{formatBytes(doc.file_size)}</span>}
                                {doc.is_verified && doc.verification_id && (
                                  <span className="block mt-0.5 font-mono text-[9px] font-bold text-gray-900 bg-gray-50 px-1 py-0.2 rounded border border-gray-200 w-max">
                                    ID: {doc.verification_id}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {doc.is_verified && doc.verification_id && (
                                  <Link
                                    href={`/verify/${doc.verification_id}`}
                                    className="px-2.5 py-1.5 border border-pandora-gold text-pandora-gold hover:bg-pandora-gold hover:text-white rounded font-bold uppercase tracking-wider text-[9px] transition-all text-center"
                                  >
                                    Verify Online
                                  </Link>
                                )}
                                <a
                                  href={`/api/documents/${doc.id}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-pandora-charcoal text-white hover:bg-pandora-gold rounded font-bold uppercase tracking-wider text-[9px] transition-colors text-center"
                                >
                                  Download PDF
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ─── RELATED DIRECT-SALE PRODUCTS (Phase 6) ─── */}
      {relatedProducts.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 mt-20 border-t border-pandora-cream pt-16 space-y-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-pandora-gold block">
              Matching Lots
            </span>
            <h2 className="font-serif text-2xl font-medium tracking-wide mt-2 text-pandora-charcoal">
              Similar Curation Showcase Lots
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                href={`/buy/${item.slug}`}
                className="bg-white border border-pandora-cream rounded-xl p-4 hover:border-pandora-gold/40 hover:scale-[1.01] transition-all flex flex-col group shadow-sm"
              >
                <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-3 bg-pandora-cream">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1">
                  {item.origin || "Lot Showcase"}
                </span>
                <h4 className="font-serif text-sm font-semibold text-pandora-charcoal group-hover:text-pandora-gold transition-colors truncate">
                  {item.title}
                </h4>
                <div className="mt-auto pt-3 border-t border-pandora-cream flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Acquisition Price</span>
                    <span className="font-bold text-pandora-gold font-serif mt-0.5 block">{formatPrice(Number(item.price))}</span>
                  </div>
                  <span className="text-[9px] text-white bg-pandora-charcoal px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    Available
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ─── PHOTOGRAPHY LIGHTBOX DIALOG OVERLAY ─── */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95">
          {/* Header Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20">
            <span className="text-xs uppercase tracking-widest font-semibold font-mono">
              Image {activeImageIndex + 1} of {imagesList.length}
            </span>
            <div className="flex gap-4">
              <button
                onClick={() => setLightboxZoom(!lightboxZoom)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                aria-label="Toggle zoom"
              >
                {lightboxZoom ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
              </button>
              <button
                onClick={() => {
                  setLightboxOpen(false);
                  setLightboxZoom(false);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                aria-label="Close image gallery"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Core Image Display */}
          <div 
            className="relative w-full flex-1 flex items-center justify-center p-4"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className={`relative w-full h-full transition-transform duration-300 ${
              lightboxZoom ? "scale-150 cursor-zoom-out" : "scale-100"
            }`}>
              <Image
                src={imagesList[activeImageIndex]}
                alt=""
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>

            {/* Slider controls */}
            {imagesList.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(prev => prev === 0 ? imagesList.length - 1 : prev - 1);
                  }}
                  className="absolute left-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImageIndex(prev => (prev + 1) % imagesList.length);
                  }}
                  className="absolute right-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
