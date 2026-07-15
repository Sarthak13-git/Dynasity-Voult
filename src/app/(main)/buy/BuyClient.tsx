"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingCart, Check, MapPin, Clock, ArrowUp, 
  Search, X, Heart, Eye, ChevronLeft, ChevronRight
} from "lucide-react";
import { useCartStore, BuyItem } from "@/lib/cart-store";
import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { performSmartSearch, SearchableItem } from "@/lib/search-utils";

/* ────────────────────────────────────────────
   Fade-in animation wrapper
   ──────────────────────────────────────────── */

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span>{text}</span>;
  const tokens = highlight.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <span>{text}</span>;
  
  // Create a regex matching any of the tokens
  const pattern = tokens.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, i) =>
        tokens.some(t => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-yellow-200 text-pandora-charcoal font-bold rounded-sm px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

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
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────
   Add-to-Cart Button with feedback animation
   ──────────────────────────────────────────── */

function AddToCartButton({ item }: { item: BuyItem }) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    addItem(item);
    setAdded(true);
    setTimeout(() => {
      openCart();
    }, 600);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.96 }}
      className={`group flex items-center gap-3 bg-pandora-charcoal px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-white transition-all duration-500 hover:bg-pandora-gold ${
        added ? "bg-emerald-600 hover:bg-emerald-600" : ""
      }`}
      aria-label={`Add ${item.title} to cart`}
    >
      {added ? (
        <>
          <Check size={16} strokeWidth={2} />
          Added to Cart
        </>
      ) : (
        <>
          <ShoppingCart
            size={15}
            strokeWidth={1.5}
            className="transition-transform group-hover:scale-110"
          />
          Add to Cart
        </>
      )}
    </motion.button>
  );
}

/* ────────────────────────────────────────────
   REUSABLE LUXURY SHOWCASE COMPONENT
   ──────────────────────────────────────────── */

interface LuxuryCollectionSectionProps {
  product: BuyItem;
  index: number;
  reverse: boolean;
  userId: string | null;
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
  setQuickViewItem: (item: BuyItem) => void;
  setQuickViewImageIndex: (idx: number) => void;
  searchQuery?: string;
}

function LuxuryCollectionSection({
  product,
  index,
  reverse,
  userId,
  favoriteIds,
  toggleFavorite,
  setQuickViewItem,
  setQuickViewImageIndex,
  searchQuery,
}: LuxuryCollectionSectionProps) {
  const isNew = new Date(product.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
  return (
    <FadeIn delay={0.05}>
      <article
        id={`product-${product.id}`}
        className={`group flex flex-col gap-8 border-b border-pandora-cream py-12 lg:flex-row lg:gap-14 ${
          reverse ? "lg:flex-row-reverse" : ""
        }`}
      >
        {/* Image Column */}
        <div className="relative w-full overflow-hidden lg:w-2/5">
          <div className="relative aspect-[4/5] w-full bg-pandora-cream overflow-hidden">
            <Link href={`/buy/${product.slug}`} className="block relative w-full h-full">
              <Image
                src={product.image}
                alt={product.title}
                fill
                className="object-cover transition-all duration-700 group-hover:brightness-105 group-hover:scale-103"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
              {/* Quick View hover overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuickViewItem(product);
                    setQuickViewImageIndex(0);
                  }}
                  className="px-5 py-2.5 bg-white text-pandora-charcoal text-[10px] font-bold uppercase tracking-wider rounded shadow-md hover:bg-pandora-gold hover:text-white transition-all cursor-pointer"
                >
                  Quick View
                </button>
              </div>
            </Link>

            {/* Favorite button overlay */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(product.id);
              }}
              className="absolute right-4 top-4 h-9 w-9 rounded-full bg-white/80 hover:bg-white text-pandora-charcoal hover:text-red-500 shadow-md backdrop-blur-sm flex items-center justify-center transition-all duration-300 z-20 cursor-pointer"
              aria-label="Add to favorites"
            >
              <Heart
                size={16}
                fill={favoriteIds.includes(product.id) ? "#ef4444" : "none"}
                className={favoriteIds.includes(product.id) ? "text-red-500" : "text-pandora-charcoal"}
              />
            </button>

            {/* Badges overlay */}
            <div className="absolute left-4 top-4 flex flex-col gap-1.5 z-20 pointer-events-none">
              <div className="rounded-sm bg-white/90 px-2.5 py-0.5 backdrop-blur-sm shadow-sm">
                <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-pandora-charcoal">
                  {product.category}
                </span>
              </div>
              <div className="rounded-sm bg-pandora-gold/90 px-2.5 py-0.5 backdrop-blur-sm shadow-sm">
                <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white">
                  Available
                </span>
              </div>
              {isNew && (
                <div className="rounded-sm bg-emerald-600/95 px-2.5 py-0.5 backdrop-blur-sm shadow-sm">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white">
                    New
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details Column */}
        <div className="flex w-full flex-col justify-center lg:w-3/5">
          {/* Index number */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-pandora-gold">
            {String(index + 1).padStart(2, "0")}
          </p>

          <Link href={`/buy/${product.slug}`}>
            <h2 className="mt-3 font-serif text-3xl font-medium text-pandora-charcoal transition-colors group-hover:text-pandora-gold md:text-4xl cursor-pointer">
              <HighlightedText text={product.title} highlight={searchQuery || ""} />
            </h2>
          </Link>

          {/* Origin & Era tags */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-[12px] text-pandora-gray">
              <MapPin size={13} strokeWidth={1.5} className="text-pandora-gold" />
              {product.origin}
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-pandora-gray">
              <Clock size={13} strokeWidth={1.5} className="text-pandora-gold" />
              {product.era}
            </span>
          </div>

          <p className="mt-5 text-[15px] leading-relaxed text-pandora-gray">
            <HighlightedText text={product.description} highlight={searchQuery || ""} />
          </p>

          {/* Divider */}
          <div className="my-6 h-px w-16 bg-pandora-cream" />

          {/* Price & CTA */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-pandora-gray-light">
                Price
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-pandora-charcoal md:text-3xl">
                {product.formattedPrice}
              </p>
            </div>
            <AddToCartButton item={product} />
          </div>
        </div>
      </article>
    </FadeIn>
  );
}

/* ════════════════════════════════════════════
   BUY PAGE CLIENT
   ════════════════════════════════════════════ */

export default function BuyClient({
  buyItems,
  title,
  description,
  subtitle,
  hideHero = false,
}: {
  buyItems: BuyItem[];
  title?: string;
  description?: string;
  subtitle?: string;
  hideHero?: boolean;
}) {
  const router = useRouter();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [quickViewItem, setQuickViewItem] = useState<BuyItem | null>(null);
  const [quickViewImageIndex, setQuickViewImageIndex] = useState(0);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchVal, setSearchVal] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debouncing search query 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // Load user favorites and session
  useEffect(() => {
    const supabase = createClient();
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: favs } = await supabase
          .from("favorites")
          .select("artifact_id")
          .eq("user_id", session.user.id);
        if (favs) {
          setFavoriteIds(favs.map(f => f.artifact_id));
        }
      }
    }
    loadSession();
  }, []);

  const toggleFavorite = async (artifactId: string) => {
    const supabase = createClient();
    if (!userId) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      if (favoriteIds.includes(artifactId)) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("artifact_id", artifactId);
        if (error) throw error;
        setFavoriteIds(prev => prev.filter(id => id !== artifactId));
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: userId, artifact_id: artifactId });
        if (error) throw error;
        setFavoriteIds(prev => [...prev, artifactId]);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dynamic Categories list from DB products
  const categories = useMemo(() => {
    const distinct = Array.from(new Set(buyItems.map(item => item.category)));
    return ["All", ...distinct];
  }, [buyItems]);

  // Map items to SearchableItem format for search utility
  const searchableItems = useMemo((): SearchableItem[] => {
    return buyItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      origin: item.origin,
      era: item.era,
      provenance: item.provenance,
      shortHeadline: item.shortHeadline,
      historicalPeriod: item.historicalPeriod,
      conditionReport: item.conditionReport,
      ownershipHistory: item.ownershipHistory,
      sellerStoreName: (item as any).sellerStoreName,
      rawItem: item,
    }));
  }, [buyItems]);

  // Perform smart search
  const searchResults = useMemo(() => {
    return performSmartSearch(searchableItems, searchQuery);
  }, [searchableItems, searchQuery]);

  // Suggestions list
  const suggestions = useMemo(() => {
    const trimmedVal = searchVal.trim().toLowerCase();
    if (!trimmedVal || trimmedVal === searchQuery.toLowerCase()) return [];
    
    const matches = performSmartSearch(searchableItems, searchVal);
    // Limit to top 5 distinct titles
    const uniqueTitles = Array.from(new Set(matches.map(r => r.item.title)));
    return uniqueTitles.slice(0, 5);
  }, [searchableItems, searchVal, searchQuery]);

  const hasExactSearchMatch = useMemo(() => {
    if (searchQuery.trim() === "") return true;
    return searchResults.some(r => r.isExact);
  }, [searchResults, searchQuery]);

  // Combined Search & Category Pill filtering logic
  const filteredItems = useMemo(() => {
    const baseItems = searchQuery.trim() !== "" ? searchResults.map(r => r.item) : buyItems;
    if (selectedCategory !== "All") {
      return baseItems.filter(item => item.category === selectedCategory);
    }
    return baseItems;
  }, [buyItems, selectedCategory, searchQuery, searchResults]);

  return (
    <div className="min-h-screen bg-pandora-ivory">
      {/* ── Hero Banner ── */}
      {!hideHero && (
        <section className="relative flex h-[50vh] min-h-[400px] items-center justify-center overflow-hidden bg-pandora-charcoal">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(184,134,11,0.15)_0%,_transparent_70%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pandora-gold/40 to-transparent" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative z-10 text-center px-6"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-pandora-gold-light">
              {subtitle || "Curated Marketplace"}
            </p>
            <h1 className="mt-5 font-serif text-5xl font-medium leading-tight text-white md:text-6xl lg:text-7xl">
              {title ? (
                title
              ) : (
                <>
                  Acquire the <span className="italic">Extraordinary</span>
                </>
              )}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-white/60">
              {description ||
                "Each object in our collection has been authenticated, documented, and presented with the reverence it deserves. Select your piece of history."}
            </p>
            <div className="mx-auto mt-8 h-px w-20 bg-gradient-to-r from-transparent via-pandora-gold to-transparent" />
          </motion.div>
        </section>
      )}

      {/* ── Search and Category Filters ── */}
      <FadeIn>
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 pt-12 pb-4 space-y-6">
          {/* Luxury Search Input Bar */}
          <div className="relative max-w-md w-full z-30">
            <div className="relative w-full bg-white border border-pandora-cream shadow-sm rounded-md flex items-center px-4 py-3">
              <Search size={18} strokeWidth={1.5} className="text-pandora-gray flex-shrink-0" />
              <input
                id="search-input"
                type="text"
                placeholder="Search title, origin, era, period..."
                className="w-full ml-3 bg-transparent text-[13px] text-pandora-charcoal focus:outline-none placeholder-pandora-gray/50 uppercase tracking-wider font-semibold"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const valTrimmed = searchVal.trim().toUpperCase();
                    if (/^DV-\d{4}-\d+/i.test(valTrimmed) || valTrimmed.startsWith("DV-")) {
                      router.push(`/verify/${valTrimmed}`);
                    } else {
                      setSearchQuery(searchVal);
                    }
                  }
                }}
              />
              {searchVal && (
                <button 
                  onClick={() => {
                    setSearchVal("");
                    setSearchQuery("");
                  }} 
                  className="text-pandora-gray hover:text-pandora-charcoal transition-colors ml-2 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {/* Suggestions list */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-pandora-cream rounded-md shadow-lg z-30 overflow-hidden">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchVal(sug);
                      setSearchQuery(sug);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-pandora-charcoal hover:bg-pandora-cream font-semibold uppercase tracking-wider transition-colors border-b border-pandora-cream/50 last:border-b-0 cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Category Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pandora-gray mr-2">
              Categories:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-all duration-300 ${
                  selectedCategory === cat
                    ? "bg-pandora-charcoal text-white border-pandora-charcoal"
                    : "bg-white text-pandora-gray border-pandora-cream hover:border-pandora-gold hover:text-pandora-gold"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* ── Items List ── */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-10">
        {searchQuery.trim() !== "" && !hasExactSearchMatch && filteredItems.length > 0 && (
          <div className="mb-10 rounded-lg bg-amber-50/40 border border-pandora-gold/25 p-5 text-center shadow-sm max-w-md mx-auto">
            <p className="text-[10px] uppercase tracking-[0.25em] text-pandora-gold font-bold">
              No exact match found
            </p>
            <p className="text-md font-serif italic text-pandora-charcoal mt-1.5">
              Showing Similar Results
            </p>
          </div>
        )}
        <div className="space-y-0">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <LuxuryCollectionSection
                key={item.id}
                product={item}
                index={index}
                reverse={index % 2 === 1}
                userId={userId}
                favoriteIds={favoriteIds}
                toggleFavorite={toggleFavorite}
                setQuickViewItem={setQuickViewItem}
                setQuickViewImageIndex={setQuickViewImageIndex}
                searchQuery={searchQuery}
              />
            ))
          ) : buyItems.length > 0 ? (
            <FadeIn>
              <div className="flex flex-col items-center justify-center text-center py-20 px-6 border border-pandora-cream bg-white shadow-sm rounded-xl">
                <span className="text-4xl mb-4">🔎</span>
                <h3 className="font-serif text-2xl font-medium text-pandora-charcoal tracking-wide">
                  No Matching Antiquities
                </h3>
                <p className="text-sm text-pandora-gray mt-3 max-w-md leading-relaxed">
                  No curated collection assets match your active search terms or category selection. Please try another query or clear filters.
                </p>
                <button
                  onClick={() => {
                    setSearchVal("");
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  className="mt-6 border border-pandora-gold px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-pandora-gold hover:bg-pandora-gold hover:text-white transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            </FadeIn>
          ) : (
            <FadeIn>
              <div className="flex flex-col items-center justify-center text-center py-20 px-6 border border-pandora-cream bg-white shadow-sm rounded-xl">
                <span className="text-4xl mb-4">🏛️</span>
                <h3 className="font-serif text-2xl font-medium text-pandora-charcoal tracking-wide">
                  No Acquisitions Available
                </h3>
                <p className="text-sm text-pandora-gray mt-3 max-w-md leading-relaxed">
                  The digital heritage vault is currently empty. Direct acquisitions are undergoing private cataloging. Please view our live auctions page.
                </p>
              </div>
            </FadeIn>
          )}
        </div>
      </div>

      {/* ── Trust Bar ── */}
      <FadeIn>
        <section className="bg-pandora-charcoal py-16">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-12 px-6 md:gap-20 lg:px-12">
            {[
              { value: "100%", label: "Authenticated" },
              { value: "Global", label: "Shipping" },
              { value: "Secure", label: "Transactions" },
              { value: "24/7", label: "Concierge" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="font-serif text-2xl font-medium text-pandora-gold-light md:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/40">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* ── Scroll-to-top ── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-pandora-charcoal text-white shadow-lg transition-colors hover:bg-pandora-gold"
            aria-label="Scroll to top"
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Quick View Lightbox Modal ── */}
      <AnimatePresence>
        {quickViewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="relative w-full max-w-4xl overflow-hidden bg-white shadow-2xl rounded-md flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => setQuickViewItem(null)}
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white text-pandora-charcoal hover:text-black shadow-md backdrop-blur-sm transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>

              {/* Image Carousel Panel */}
              <div className="relative w-full md:w-1/2 aspect-[4/5] bg-pandora-cream flex-shrink-0">
                <Image
                  src={
                    quickViewItem.images && quickViewItem.images.length > 0
                      ? quickViewItem.images[quickViewImageIndex]
                      : quickViewItem.image
                  }
                  alt={quickViewItem.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />

                {/* Carousel Navigation */}
                {quickViewItem.images && quickViewItem.images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setQuickViewImageIndex((prev) =>
                          prev === 0 ? quickViewItem.images.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-pandora-charcoal hover:bg-white transition-colors cursor-pointer shadow-sm"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setQuickViewImageIndex((prev) =>
                          (prev + 1) % quickViewItem.images.length
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-pandora-charcoal hover:bg-white transition-colors cursor-pointer shadow-sm"
                      aria-label="Next image"
                    >
                      <ChevronRight size={16} />
                    </button>

                    {/* Carousel Indicators */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                      {quickViewItem.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setQuickViewImageIndex(i)}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            i === quickViewImageIndex ? "w-4 bg-pandora-gold" : "w-1.5 bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Details Panel */}
              <div className="w-full md:w-1/2 p-8 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-[90vh]">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pandora-gold">
                    {quickViewItem.category}
                  </span>
                  <h3 className="mt-2 font-serif text-2xl font-medium text-pandora-charcoal">
                    {quickViewItem.title}
                  </h3>

                  {/* Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1 text-[11px] text-pandora-gray">
                      <MapPin size={12} strokeWidth={1.5} className="text-pandora-gold" />
                      {quickViewItem.origin}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-pandora-gray">
                      <Clock size={12} strokeWidth={1.5} className="text-pandora-gold" />
                      {quickViewItem.era}
                    </span>
                  </div>

                  <p className="mt-5 text-[13px] leading-relaxed text-pandora-gray">
                    {quickViewItem.description}
                  </p>

                  <div className="my-5 h-px w-10 bg-pandora-cream" />

                  {/* Detailed features if available */}
                  <div className="space-y-2 text-xs text-pandora-gray-light">
                    {quickViewItem.shortHeadline && (
                      <p>
                        <span className="font-semibold uppercase tracking-wider text-pandora-charcoal mr-1">
                          Curation:
                        </span>
                        {quickViewItem.shortHeadline}
                      </p>
                    )}
                    {quickViewItem.historicalPeriod && (
                      <p>
                        <span className="font-semibold uppercase tracking-wider text-pandora-charcoal mr-1">
                          Period:
                        </span>
                        {quickViewItem.historicalPeriod}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-8 border-t border-pandora-cream pt-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest text-pandora-gray-light">
                      Acquisition Value
                    </span>
                    <p className="font-serif text-xl font-bold text-pandora-charcoal mt-0.5">
                      {quickViewItem.formattedPrice}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AddToCartButton item={quickViewItem} />
                    <Link
                      href={`/buy/${quickViewItem.slug}`}
                      className="px-5 py-4 border border-pandora-cream text-pandora-charcoal text-[11px] font-semibold uppercase tracking-wider hover:border-pandora-gold hover:text-pandora-gold transition-all"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
