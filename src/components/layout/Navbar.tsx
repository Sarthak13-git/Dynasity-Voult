"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Search, User as UserIcon, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { href: "/collection", label: "Collection" },
  { href: "/auctions", label: "Auctions" },
  { href: "/exhibitions", label: "Exhibitions" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  if (pathname?.endsWith("/bid")) {
    return null;
  }

  const isAuctionsPage = pathname === "/auctions";
  const isActive = isScrolled || isHovered || isMenuOpen || isAuctionsPage;

  return (
    <>
      <motion.header
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out",
          isActive
            ? "bg-white shadow-[0_1px_20px_rgba(0,0,0,0.06)]"
            : "bg-transparent"
        )}
      >
        <nav className="relative mx-auto flex h-16 items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-5 min-w-[140px]">
            <button
              onClick={() => setIsMenuOpen(true)}
              className={cn(
                "flex items-center gap-1.5 transition-colors duration-500 cursor-pointer",
                isActive ? "text-pandora-charcoal" : "text-white"
              )}
              aria-label="Open menu"
            >
              <Menu size={24} strokeWidth={1} />
              <span className="hidden text-[13px] font-normal tracking-[0.02em] sm:inline">
                Menu
              </span>
            </button>

            <button
              className={cn(
                "flex items-center gap-1.5 transition-colors duration-500 cursor-pointer",
                isActive ? "text-pandora-charcoal" : "text-white"
              )}
              aria-label="Search"
            >
              <Search size={22} strokeWidth={1} />
              <span className="hidden text-[13px] font-normal tracking-[0.02em] sm:inline">
                Search
              </span>
            </button>
          </div>

          <Link
            href="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center"
          >
            <span
              className={cn(
                "font-serif text-2xl font-bold tracking-[0.2em] transition-colors duration-500 whitespace-nowrap",
                isActive ? "text-pandora-charcoal" : "text-white"
              )}
            >
              PANDORA
            </span>
          </Link>

          <div className="flex items-center gap-6 min-w-[140px] justify-end">
            <Link
              href="/seller"
              className={cn(
                "hidden text-[13px] font-medium uppercase tracking-[0.1em] transition-colors duration-500 md:block",
                isActive
                  ? "text-pandora-gold hover:text-pandora-gold-light"
                  : "text-white/80 hover:text-white"
              )}
            >
              Seller
            </Link>

            <Link
              href="/contact"
              className={cn(
                "hidden text-[13px] font-normal tracking-[0.02em] transition-colors duration-500 sm:inline",
                isActive
                  ? "text-pandora-charcoal hover:text-black"
                  : "text-white hover:text-white/80"
              )}
            >
              Call Us
            </Link>

            {user ? (
               <div className="flex items-center gap-4">
                 <Link
                   href="/profile"
                   aria-label="Profile"
                   className={cn(
                     "transition-colors duration-500",
                     isActive
                       ? "text-pandora-charcoal hover:text-black"
                       : "text-white hover:text-white/80"
                   )}
                 >
                   <UserIcon size={20} strokeWidth={1} />
                 </Link>
                 <button
                   onClick={() => supabase.auth.signOut()}
                   aria-label="Sign out"
                   className={cn(
                     "transition-colors duration-500",
                     isActive
                       ? "text-pandora-charcoal hover:text-black"
                       : "text-white hover:text-white/80"
                   )}
                 >
                   <LogOut size={20} strokeWidth={1} />
                 </button>
               </div>
            ) : (
              <Link
                href="/login"
                className={cn(
                  "transition-colors duration-500",
                  isActive
                    ? "text-pandora-charcoal hover:text-black"
                    : "text-white hover:text-white/80"
                )}
                aria-label="Sign in"
              >
                <UserIcon size={20} strokeWidth={1} />
              </Link>
            )}
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[60] bg-black/40"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed top-0 left-0 z-[70] h-full w-[320px] max-w-[85vw] bg-white shadow-2xl flex flex-col"
            >
              {/* Close button */}
              <div className="flex items-center gap-2 px-6 py-5 border-b border-pandora-cream">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 text-pandora-charcoal transition-colors hover:text-pandora-gold cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={18} strokeWidth={1.5} />
                  <span className="text-[12px] font-medium uppercase tracking-[0.08em]">
                    Close
                  </span>
                </button>
              </div>

              {/* Nav Links */}
              <nav className="flex-1 overflow-y-auto px-6 py-8">
                <ul className="flex flex-col gap-1">
                  {navLinks.map((link, i) => (
                    <motion.li
                      key={link.href}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-3.5 text-[15px] font-medium tracking-[0.02em] text-pandora-charcoal transition-colors hover:text-pandora-gold"
                      >
                        {link.label}
                      </Link>
                    </motion.li>
                  ))}
                </ul>

                {/* Divider */}
                <div className="my-6 h-px bg-pandora-cream" />

                {/* Sign In / Sign Out */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.1 + navLinks.length * 0.06,
                    duration: 0.35,
                  }}
                >
                  <Link
                    href="/seller"
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-3 text-[14px] font-medium uppercase tracking-[0.1em] text-pandora-charcoal transition-colors hover:text-pandora-gold"
                  >
                    Seller
                  </Link>
                  {user ? (
                    <div className="flex flex-col gap-4">
                      <Link
                        href="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 py-2 text-[15px] font-medium tracking-[0.02em] text-pandora-charcoal transition-colors hover:text-pandora-gold"
                      >
                        <UserIcon size={18} strokeWidth={1.5} />
                        My Profile
                      </Link>
                      <button
                        onClick={() => {
                          supabase.auth.signOut();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 py-2 text-[15px] font-medium tracking-[0.02em] text-pandora-charcoal transition-colors hover:text-pandora-gold"
                      >
                        <LogOut size={18} strokeWidth={1.5} />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 py-3.5 text-[15px] font-medium tracking-[0.02em] text-pandora-charcoal transition-colors hover:text-pandora-gold"
                    >
                      <UserIcon size={18} strokeWidth={1.5} />
                      Sign In
                    </Link>
                  )}
                </motion.div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
