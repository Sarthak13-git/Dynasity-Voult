"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Script from "next/script";
import { Rotate3d, Play, Image as ImageIcon, Video, ChevronLeft, ChevronRight } from "lucide-react";

interface AuctionHeroShowcaseProps {
  title: string;
  mediaType: "video" | "model_3d" | null;
  model3d: string | null;
  heroVideo: string | null;
  frontImage: string | null;
  backImage: string | null;
  leftImage: string | null;
  rightImage: string | null;
  galleryImages: string[];
  fallbackImages: string[];
  fallbackVideos: string[];
}

export default function AuctionHeroShowcase({
  title,
  mediaType,
  model3d,
  heroVideo,
  frontImage,
  backImage,
  leftImage,
  rightImage,
  galleryImages = [],
  fallbackImages = [],
  fallbackVideos = [],
}: AuctionHeroShowcaseProps) {
  const [activeTab, setActiveTab] = useState<"3d" | "video" | "gallery">("gallery");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Setup unique list of images
  const uniqueImages: string[] = [];
  const addImage = (src: string | null) => {
    if (src && !uniqueImages.includes(src)) {
      uniqueImages.push(src);
    }
  };

  addImage(frontImage);
  addImage(backImage);
  addImage(leftImage);
  addImage(rightImage);
  galleryImages.forEach((img) => addImage(img));
  fallbackImages.forEach((img) => addImage(img));

  // Default image fallback if list is empty
  if (uniqueImages.length === 0) {
    uniqueImages.push("/auctions/luxury-items-showcase1.JPG");
  }

  // Determine actual available tabs
  const has3d = !!model3d;
  const hasVideo = !!heroVideo || fallbackVideos.length > 0;
  const activeVideoUrl = heroVideo || fallbackVideos[0] || null;

  useEffect(() => {
    setIsMounted(true);
    // Set default tab based on priority: 1. 3D, 2. Video, 3. Gallery
    if (has3d) {
      setActiveTab("3d");
    } else if (hasVideo) {
      setActiveTab("video");
    } else {
      setActiveTab("gallery");
    }
  }, [has3d, hasVideo]);

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? uniqueImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === uniqueImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
      {/* Script for 3D model viewer */}
      <Script
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
        type="module"
        strategy="afterInteractive"
      />

      {/* Main Showcase Container */}
      <div className="relative w-full aspect-video md:h-[550px] bg-black/60 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center group shadow-2xl">
        {/* 3D Model tab */}
        {activeTab === "3d" && has3d && isMounted && (
          <div className="w-full h-full relative">
            {React.createElement("model-viewer", {
              src: model3d,
              ar: true,
              "ar-modes": "webxr scene-viewer quick-look",
              "camera-controls": true,
              poster: frontImage || uniqueImages[0],
              "shadow-intensity": "1",
              "auto-rotate": true,
              style: { width: "100%", height: "100%", backgroundColor: "transparent" },
              className: "w-full h-full",
            })}
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 pointer-events-none">
              <Rotate3d size={14} className="text-pandora-gold-light animate-spin" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white">Interactive 3D Model</span>
            </div>
          </div>
        )}

        {/* Video tab */}
        {activeTab === "video" && activeVideoUrl && (
          <div className="w-full h-full relative">
            <video
              autoPlay
              muted
              loop
              playsInline
              controls
              className="w-full h-full object-cover"
            >
              <source src={activeVideoUrl} type="video/mp4" />
            </video>
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 pointer-events-none">
              <Play size={14} className="text-pandora-gold-light fill-pandora-gold-light" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white">Cinematic Video Tour</span>
            </div>
          </div>
        )}

        {/* Gallery tab */}
        {activeTab === "gallery" && (
          <div className="w-full h-full relative flex items-center justify-center">
            <Image
              src={uniqueImages[activeImageIndex]}
              alt={`${title} - View ${activeImageIndex + 1}`}
              fill
              priority
              className="object-cover transition-opacity duration-500"
            />

            {/* Gallery Navigation Arrows */}
            {uniqueImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 border border-white/10 p-2.5 rounded-full text-white transition-all hover:scale-105"
                  aria-label="Previous view"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 border border-white/10 p-2.5 rounded-full text-white transition-all hover:scale-105"
                  aria-label="Next view"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Image counter indicator */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className="text-[10px] font-semibold tracking-widest text-white">
                {activeImageIndex + 1} / {uniqueImages.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar - Switch tabs and display thumbnails */}
      <div className="mt-6 flex flex-col md:flex-row gap-6 justify-between items-center">
        {/* Toggle Toggles */}
        <div className="flex gap-2 p-1.5 bg-white/5 border border-white/10 rounded-full">
          {has3d && (
            <button
              onClick={() => setActiveTab("3d")}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === "3d"
                  ? "bg-pandora-gold text-white shadow-lg"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Rotate3d size={14} />
              3D View
            </button>
          )}

          {hasVideo && (
            <button
              onClick={() => setActiveTab("video")}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === "video"
                  ? "bg-pandora-gold text-white shadow-lg"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Video size={14} />
              Video Tour
            </button>
          )}

          <button
            onClick={() => setActiveTab("gallery")}
            className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === "gallery"
                ? "bg-pandora-gold text-white shadow-lg"
                : "text-white/60 hover:text-white"
            }`}
          >
            <ImageIcon size={14} />
            Gallery ({uniqueImages.length})
          </button>
        </div>

        {/* Thumbnail gallery preview list (Only visible when gallery tab is active) */}
        {activeTab === "gallery" && uniqueImages.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto max-w-full pb-2 custom-scrollbar">
            {uniqueImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-16 h-12 rounded-lg overflow-hidden border transition-all hover:scale-105 shrink-0 ${
                  activeImageIndex === idx
                    ? "border-pandora-gold-light ring-1 ring-pandora-gold-light"
                    : "border-white/10 opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
