"use client";

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

/* ────────────────────────────────────────────
   Fade-in animation wrapper
   ──────────────────────────────────────────── */

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

/* ════════════════════════════════════════════
   SECTION 1 — HERO (Louis Vuitton style)
   ════════════════════════════════════════════ */

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
          alt="Rare artifacts from the PANDORA collection"
          fill
          priority
          className="editorial-image"
        />
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
      </motion.div>

      {/* Hero Content */}
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
                className={`flex flex-col items-center gap-12 lg:flex-row lg:gap-20 ${
                  item.position === "right" ? "lg:flex-row-reverse" : ""
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

const featuredArtifacts = [
  {
    title: "Byzantine Gold Pectoral Cross",
    origin: "Constantinople, 6th Century",
    estimate: "$480,000 — $620,000",
    image: "/editorial-2.png",
  },
  {
    title: "Ming Dynasty Jade Dragon",
    origin: "China, 15th Century",
    estimate: "$1,200,000 — $1,800,000",
    image: "/editorial-1.png",
  },
  {
    title: "Book of Hours, Flemish",
    origin: "Bruges, c. 1480",
    estimate: "$320,000 — $450,000",
    image: "/editorial-3.png",
  },
];

function FeaturedCollection() {
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
          {featuredArtifacts.map((artifact, index) => (
            <FadeIn key={index} delay={index * 0.15}>
              <Link href="/collection" className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-pandora-ivory">
                  <Image
                    src={artifact.image}
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
                    {artifact.origin}
                  </p>
                  <p className="mt-3 text-[13px] font-medium tracking-wide text-pandora-charcoal">
                    Estimated {artifact.estimate}
                  </p>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════
   SECTION 4 — THE HOUSE OF PANDORA
   ════════════════════════════════════════════ */

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
                alt="The House of PANDORA"
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
              <span className="italic">Pandora</span>
            </h2>
            <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-pandora-gray">
              <p>
                Founded on the conviction that extraordinary objects deserve
                extraordinary stewardship, PANDORA operates at the intersection
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
   SECTION 5 — AUCTION PREVIEW
   ════════════════════════════════════════════ */

function AuctionPreview() {
  return (
    <section id="auctions" className="bg-pandora-charcoal py-32 text-white">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <FadeIn>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-pandora-gold-light">
              Upcoming
            </p>
            <h2 className="mt-4 font-serif text-4xl font-medium md:text-5xl">
              The Spring Sale
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-white/60">
              A private evening of exceptional lots — ancient gold, rare
              manuscripts, and decorative arts from distinguished private
              collections.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-12 md:gap-20">
            {[
              { value: "47", label: "Lots" },
              { value: "12", label: "Countries" },
              { value: "$24M", label: "Est. Total" },
              { value: "Mar 28", label: "Live Date" },
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

        <FadeIn delay={0.3}>
          <div className="mt-16 text-center">
            <Link
              href="/auctions"
              className="group inline-flex items-center gap-3 border border-white/20 px-10 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-white transition-all hover:border-pandora-gold-light hover:text-pandora-gold-light"
            >
              <Clock size={14} strokeWidth={1.5} />
              Register for Auction
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

function HeritageSection() {
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
            {[
              { value: "2,400+", label: "Authenticated Artifacts" },
              { value: "147", label: "Private Collections Served" },
              { value: "32", label: "Countries Represented" },
              { value: "98.7%", label: "Authentication Accuracy" },
            ].map((stat, index) => (
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
  return (
    <>
      <HeroSection />
      <EditorialGallery />
      <FeaturedCollection />
      <BrandStory />
      <AuctionPreview />
      <HeritageSection />
    </>
  );
}
