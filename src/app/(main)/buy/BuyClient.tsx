"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, Check, MapPin, Clock, ArrowUp } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { useState, useEffect } from "react";

export interface BuyItem {
  id: string;
  title: string;
  description: string;
  price: number;
  formattedPrice: string;
  origin: string;
  era: string;
  image: string;
  category: string;
}

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
      className={`group flex items-center gap-3 px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] transition-all duration-500 ${
        added
          ? "bg-emerald-600 text-white"
          : "bg-pandora-charcoal text-white hover:bg-pandora-gold"
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

/* ════════════════════════════════════════════
   BUY PAGE CLIENT
   ════════════════════════════════════════════ */

export default function BuyClient({ buyItems }: { buyItems: BuyItem[] }) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-pandora-ivory">
      {/* ── Hero Banner ── */}
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
            Curated Marketplace
          </p>
          <h1 className="mt-5 font-serif text-5xl font-medium leading-tight text-white md:text-6xl lg:text-7xl">
            Acquire the{" "}
            <span className="italic">Extraordinary</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-white/60">
            Each object in our collection has been authenticated, documented,
            and presented with the reverence it deserves. Select your piece of
            history.
          </p>
          <div className="mx-auto mt-8 h-px w-20 bg-gradient-to-r from-transparent via-pandora-gold to-transparent" />
        </motion.div>
      </section>

      {/* ── Category Pills ── */}
      <FadeIn>
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12 pt-12 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pandora-gray mr-2">
              Categories:
            </span>
            {["All", "Antiquities", "Sculptures", "Manuscripts", "Arms & Armor", "Decorative Arts", "Textiles", "Objets d'Art"].map(
              (cat) => (
                <span
                  key={cat}
                  className="cursor-pointer rounded-full border border-pandora-cream bg-white px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-pandora-gray transition-all hover:border-pandora-gold hover:text-pandora-gold first:bg-pandora-charcoal first:text-white first:border-pandora-charcoal"
                >
                  {cat}
                </span>
              )
            )}
          </div>
        </div>
      </FadeIn>

      {/* ── Items List ── */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 py-10">
        <div className="space-y-0">
          {buyItems.map((item, index) => (
            <FadeIn key={item.id} delay={0.05}>
              <article
                id={`product-${item.id}`}
                className={`group flex flex-col gap-8 border-b border-pandora-cream py-12 lg:flex-row lg:gap-14 ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Image */}
                <div className="relative w-full overflow-hidden lg:w-2/5">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative aspect-[4/5] w-full bg-pandora-cream"
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition-all duration-700 group-hover:brightness-105"
                      sizes="(max-width: 768px) 100vw, 40vw"
                    />
                    {/* Category badge */}
                    <div className="absolute left-4 top-4 rounded-sm bg-white/90 px-3 py-1 backdrop-blur-sm">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-pandora-charcoal">
                        {item.category}
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Details */}
                <div className="flex w-full flex-col justify-center lg:w-3/5">
                  {/* Index number */}
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-pandora-gold">
                    {String(index + 1).padStart(2, "0")}
                  </p>

                  <h2 className="mt-3 font-serif text-3xl font-medium text-pandora-charcoal transition-colors group-hover:text-pandora-gold md:text-4xl">
                    {item.title}
                  </h2>

                  {/* Origin & Era tags */}
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[12px] text-pandora-gray">
                      <MapPin size={13} strokeWidth={1.5} className="text-pandora-gold" />
                      {item.origin}
                    </span>
                    <span className="flex items-center gap-1.5 text-[12px] text-pandora-gray">
                      <Clock size={13} strokeWidth={1.5} className="text-pandora-gold" />
                      {item.era}
                    </span>
                  </div>

                  <p className="mt-5 text-[15px] leading-relaxed text-pandora-gray">
                    {item.description}
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
                        {item.formattedPrice}
                      </p>
                    </div>
                    <AddToCartButton item={item} />
                  </div>
                </div>
              </article>
            </FadeIn>
          ))}
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
    </div>
  );
}
