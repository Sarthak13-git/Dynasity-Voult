"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchHomepageStats, HomepageStats } from "@/lib/aggregators";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import {
  ArrowRight,
  ArrowDown,
  Shield,
  Eye,
  Award,
  Clock,
} from "lucide-react";


  

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}


   // SECTION 1 — HERO 

function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const imageOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <section
      ref={containerRef}
      id="hero"
      className="relative h-screen w-full overflow-hidden"
    >
      {/* Background Image with Parallax */}
      <motion.div
        style={{ scale: imageScale, opacity: imageOpacity }}
        className="absolute inset-0"
      >
        <Image
          src="/hero.png"
          alt="Rare artifacts from the Dynasity-Voult collection"
          fill
          priority
          className="editorial-image"
        />
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
      </motion.div>

      <motion.div
        style={{ y: textY }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-[11px] font-medium uppercase tracking-[0.4em] text-white/70"
        >
          Est. MMXXVI
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-6 font-serif text-5xl font-medium leading-tight tracking-wide text-white md:text-7xl lg:text-8xl"
        >
          Where History
          <br />
          <span className="italic">Lives Again</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-8 max-w-md text-[15px] leading-relaxed text-white/70"
        >
          A premier heritage house for rare, ancient, and historically
          significant artifacts.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-10 flex items-center gap-6"
        >
          <Link
            href="/collection"
            className="group flex items-center gap-3 bg-white px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-pandora-charcoal transition-all hover:bg-pandora-gold hover:text-white"
          >
            Explore Collection
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/auctions"
            className="text-[12px] font-medium uppercase tracking-[0.15em] text-white/80 transition-colors hover:text-white border-b border-white/30 pb-1 hover:border-white"
          >
            View Auctions
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
            Scroll
          </span>
          <ArrowDown size={14} className="text-white/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ════════════════════════════════════════════
   SECTION 2 — EDITORIAL IMAGE GALLERY
   ════════════════════════════════════════════ */

const editorialItems = [
  {
    src: "/editorial-1.png",
    alt: "Classical marble sculpture",
    title: "The Classical Canon",
    caption:
      "Masterworks from antiquity, preserved through millennia — each piece a testament to human artistry.",
    position: "left" as const,
  },
  {
    src: "/editorial-2.png",
    alt: "Royal crown with gemstones",
    title: "Crowned in Legacy",
    caption:
      "Regal jewels and ornaments that once adorned the courts of empires, now preserved for posterity.",
    position: "right" as const,
  },
  {
    src: "/editorial-3.png",
    alt: "Ancient illuminated manuscript",
    title: "Written in Gold",
    caption:
      "Illuminated manuscripts bearing the knowledge of ages — texts that shaped civilisations.",
    position: "left" as const,
  },
  {
    src: "/editorial-4.png",
    alt: "Antique pocket watch mechanism",
    title: "The Art of Time",
    caption:
      "Horological masterpieces where mechanical precision meets decorative artistry.",
    position: "right" as const,
  },
];

function EditorialGallery() {
  return (
    <section id="editorial" className="bg-pandora-ivory py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <FadeIn>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.4em] text-pandora-gold">
            The Archive
          </p>
          <h2 className="mt-4 text-center font-serif text-4xl font-medium text-pandora-charcoal md:text-5xl">
            Objects of Distinction
          </h2>
        </FadeIn>

        <div className="mt-24 space-y-32">
          {editorialItems.map((item, index) => (
            <FadeIn key={index} delay={0.1}>
              <div
                className={`flex flex-col items-center gap-12 lg:flex-row lg:gap-20 ${item.position === "right" ? "lg:flex-row-reverse" : ""
                  }`}
              >
                {/* Image */}
                <div className="relative w-full overflow-hidden lg:w-3/5">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative aspect-[4/5] w-full"
                  >
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      className="editorial-image"
                      sizes="(max-width: 768px) 100vw, 60vw"
                    />
                  </motion.div>
                </div>

                {/* Text */}
                <div className="w-full lg:w-2/5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-pandora-gold">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 font-serif text-3xl font-medium text-pandora-charcoal md:text-4xl">
                    {item.title}
                  </h3>
                  <p className="mt-6 text-[15px] leading-relaxed text-pandora-gray">
                    {item.caption}
                  </p>
                  <Link
                    href="/collection"
                    className="group mt-8 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-pandora-charcoal transition-colors hover:text-pandora-gold"
                  >
                    Discover More
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   SECTION 3 — FEATURED COLLECTION
   ════════════════════════════════════════════ */

function FeaturedCollection({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <section id="featured" className="bg-pandora-cream py-32">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <FadeIn>
            <div className="text-center py-20 px-6 border border-pandora-gold/10 bg-white/50 backdrop-blur-sm rounded-xl">
              <span className="text-4xl mb-4">🏛️</span>
              <h3 className="font-serif text-2xl font-medium text-pandora-charcoal tracking-wide">
                Archive Curation in Progress
              </h3>
              <p className="text-sm text-pandora-gray mt-3 max-w-md mx-auto leading-relaxed">
                Our digital heritage vault is currently undergoing private curation. All previously listed items have been acquired. Please check back soon or view our live auctions.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
    );
  }

  return (
    <section id="featured" className="bg-pandora-cream py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <FadeIn>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-pandora-gold">
                Curated Selection
              </p>
              <h2 className="mt-4 font-serif text-4xl font-medium text-pandora-charcoal md:text-5xl">
                Featured Lots
              </h2>
            </div>
            <Link
              href="/collection"
              className="group flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-pandora-charcoal transition-colors hover:text-pandora-gold"
            >
              View All
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {items.map((artifact, index) => {
            const image = artifact.thumbnail_url || (artifact.images && artifact.images[0]) || "/editorial-1.png";
            const estimate = artifact.estimated_value ? `$${artifact.estimated_value.toLocaleString()}` : "Estimate on Request";
            return (
              <FadeIn key={artifact.id || index} delay={index * 0.15}>
                <Link href={`/buy/${artifact.slug || artifact.id}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden bg-pandora-ivory">
                    <Image
                      src={image}
                      alt={artifact.title}
                      fill
                      className="editorial-image transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="mt-6">
                    <h3 className="font-serif text-xl font-medium text-pandora-charcoal transition-colors group-hover:text-pandora-gold">
                      {artifact.title}
                    </h3>
                    <p className="mt-1 text-[13px] text-pandora-gray">
                      {artifact.origin || "Origin Unknown"}
                    </p>
                    <p className="mt-3 text-[13px] font-medium tracking-wide text-pandora-charcoal">
                      Estimated {estimate}
                    </p>
                  </div>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── SECTION 4 — THE HOUSE OF DYNASITY-VOULT ─── */

function BrandStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section
      ref={containerRef}
      id="about-pandora"
      className="bg-pandora-ivory py-32"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="flex flex-col items-center gap-16 lg:flex-row lg:gap-24">
          {/* Image with Parallax */}
          <FadeIn className="relative w-full overflow-hidden lg:w-1/2">
            <motion.div
              style={{ y: imageY }}
              className="relative aspect-[4/5]"
            >
              <Image
                src="/editorial-4.png"
                alt="The House of Dynasity-Voult"
                fill
                className="editorial-image"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </motion.div>
          </FadeIn>

          {/* Text */}
          <FadeIn delay={0.2} className="w-full lg:w-1/2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-pandora-gold">
              Our Heritage
            </p>
            <h2 className="mt-4 font-serif text-4xl font-medium leading-tight text-pandora-charcoal md:text-5xl">
              The House of
              <br />
              <span className="italic">Dynasity-Voult</span>
            </h2>
            <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-pandora-gray">
              <p>
                Founded on the conviction that extraordinary objects deserve
                extraordinary stewardship, Dynasity-Voult operates at the intersection
                of a museum, a premium marketplace, and a high-end auction
                house.
              </p>
              <p>
                We maintain a curated digital archive of rare artifacts, provide
                meticulous historical documentation, and facilitate transactions
                worthy of the objects we represent — from direct acquisitions to
                live-streamed auctions attended by collectors worldwide.
              </p>
              <p>
                Every artifact in our care carries a verified provenance record,
                expert authentication, and the assurance that its story will
                endure for generations to come.
              </p>
            </div>
            <Link
              href="/about"
              className="group mt-10 inline-flex items-center gap-3 border border-pandora-charcoal px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-pandora-charcoal transition-all hover:bg-pandora-charcoal hover:text-white"
            >
              Learn Our Story
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   SECTION 5 — LIVE AUCTION PREVIEW
   ════════════════════════════════════════════ */

function AuctionPreview({ liveAuctions }: { liveAuctions: any[] }) {
  const liveCount = liveAuctions.filter((a) => a.status === "live").length;
  const upcomingCount = liveAuctions.filter((a) => a.status === "upcoming").length;
  const hasAuctions = liveAuctions.length > 0;

  return (
    <section id="auctions" className="bg-pandora-charcoal py-32 text-white">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <FadeIn>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-pandora-gold-light">
              {hasAuctions ? (liveCount > 0 ? "Now Live" : "Upcoming") : "Coming Soon"}
            </p>
            <h2 className="mt-4 font-serif text-4xl font-medium md:text-5xl">
              {hasAuctions
                ? liveCount > 0
                  ? "Auctions Live Now"
                  : "Upcoming Auction Events"
                : "The Collection Awaits"}
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-white/60">
              {hasAuctions
                ? liveCount > 0
                  ? "Active bidding is open on our current live catalog. Participate in real-time from anywhere in the world."
                  : "Our curators are preparing the next collection of premium acquisitions for live auction."
                : "A private evening of exceptional lots — ancient gold, rare manuscripts, and decorative arts from distinguished private collections."}
            </p>
          </div>
        </FadeIn>

        {hasAuctions && (
          <FadeIn delay={0.2}>
            <div className="mt-16 flex flex-wrap items-center justify-center gap-12 md:gap-20">
              {[
                { value: String(liveAuctions.length), label: "Total Lots" },
                { value: String(liveCount), label: "Live Now" },
                { value: String(upcomingCount), label: "Scheduled" },
                {
                  value: liveAuctions
                    .reduce(
                      (acc, a) => acc + (a.artifacts?.estimated_value || 0),
                      0
                    )
                    .toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }),
                  label: "Est. Total",
                },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="font-serif text-4xl font-medium text-pandora-gold-light md:text-5xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        )}

        <FadeIn delay={0.3}>
          <div className="mt-16 text-center">
            <Link
              href="/auctions"
              className="group inline-flex items-center gap-3 border border-white/20 px-10 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-white transition-all hover:border-pandora-gold-light hover:text-pandora-gold-light"
            >
              <Clock size={14} strokeWidth={1.5} />
              {hasAuctions ? "View All Auctions" : "Register for Notifications"}
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   SECTION 6 — HERITAGE & PROVENANCE (Trust)
   ════════════════════════════════════════════ */

const trustPoints = [
  {
    icon: Shield,
    title: "Authenticated Origins",
    description:
      "Every artifact under our stewardship is verified through rigorous multi-stage authentication by independent experts.",
  },
  {
    icon: Eye,
    title: "Full Provenance",
    description:
      "Complete ownership history documented and accessible — from point of discovery to present-day custody.",
  },
  {
    icon: Award,
    title: "Expert Curation",
    description:
      "Our panel of historians, archaeologists, and art specialists ensures only objects of genuine significance enter our archive.",
  },
];

function HeritageSection({ stats }: { stats: HomepageStats }) {
  const statItems = [
    { value: stats.artifactsCount > 0 ? `${stats.artifactsCount.toLocaleString()}+` : "0", label: "Artifacts Listed" },
    { value: stats.collectionsCount > 0 ? `${stats.collectionsCount.toLocaleString()}` : "0", label: "Private Collections Served" },
    { value: stats.countriesCount > 0 ? `${stats.countriesCount.toLocaleString()}` : "0", label: "Origins Represented" },
    { value: stats.activeAuctionsCount > 0 ? `${stats.activeAuctionsCount.toLocaleString()}` : "0", label: "Active Live Auctions" },
  ];

  return (
    <section id="heritage" className="bg-pandora-ivory py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <FadeIn>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-pandora-gold">
              Our Promise
            </p>
            <h2 className="mt-4 font-serif text-4xl font-medium text-pandora-charcoal md:text-5xl">
              Heritage & Provenance
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-pandora-gray">
              Trust is the foundation of every transaction. Our commitment to
              authenticity is uncompromising.
            </p>
          </div>
        </FadeIn>

        <div className="mt-20 grid gap-12 md:grid-cols-3">
          {trustPoints.map((point, index) => (
            <FadeIn key={index} delay={index * 0.15}>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-pandora-gold/20 bg-pandora-cream">
                  <point.icon
                    size={24}
                    strokeWidth={1.2}
                    className="text-pandora-gold"
                  />
                </div>
                <h3 className="mt-6 font-serif text-xl font-medium text-pandora-charcoal">
                  {point.title}
                </h3>
                <p className="mt-4 text-[14px] leading-relaxed text-pandora-gray">
                  {point.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Stats bar */}
        <FadeIn delay={0.3}>
          <div className="mt-24 flex flex-wrap items-center justify-center gap-16 border-y border-pandora-cream py-12 md:gap-24">
            {statItems.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="font-serif text-3xl font-medium text-pandora-charcoal">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-pandora-gray-light">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   PAGE — Assemble all sections
   ════════════════════════════════════════════ */

export default function Home() {
  const [featuredLots, setFeaturedLots] = useState<any[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<any[]>([]);
  const [stats, setStats] = useState<HomepageStats>({
    artifactsCount: 0,
    collectionsCount: 0,
    countriesCount: 0,
    activeAuctionsCount: 0,
  });

  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      const { data: rawArtifacts } = await supabase
        .from("artifacts")
        .select("*, auctions(id), auction_applications(id, status), favorites(id)")
        .not("buy_now_price", "is", null)
        .not("seller_id", "is", null)
        .eq("status", "available");

      let featuredData: any[] = [];
      if (rawArtifacts) {
        // Exclude auction products & active applications
        const collectionProducts = rawArtifacts.filter((item: any) => {
          const hasAuc = item.auctions && item.auctions.length > 0;
          const hasActiveApp = item.auction_applications && item.auction_applications.some(
            (app: any) => ["pending", "approved", "under_review"].includes(app.status)
          );
          return !hasAuc && !hasActiveApp;
        });

        // Dynamic sorting: Favorites count descending, fallback to created_at descending (newest)
        collectionProducts.sort((a: any, b: any) => {
          const favsA = a.favorites ? a.favorites.length : 0;
          const favsB = b.favorites ? b.favorites.length : 0;
          if (favsB !== favsA) {
            return favsB - favsA;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        featuredData = collectionProducts.slice(0, 3);
      }

      setFeaturedLots(featuredData);

      // 2. Fetch live and upcoming auctions with artifact details
      const { data: auctionsData } = await supabase
        .from("auctions")
        .select("*, artifacts(id, title, estimated_value)")
        .in("status", ["live", "upcoming"])
        .order("start_time", { ascending: true });

      if (auctionsData) {
        setLiveAuctions(auctionsData);
      }

      // 3. Fetch live statistics using concurrent helper
      const homeStats = await fetchHomepageStats(supabase);
      setStats(homeStats);
    }

    fetchData();
  }, []);

  return (
    <>
      <HeroSection />
      <EditorialGallery />
      <FeaturedCollection items={featuredLots} />
      <BrandStory />
      <AuctionPreview liveAuctions={liveAuctions} />
      <HeritageSection stats={stats} />
    </>
  );
}
