"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/collection", label: "Collection" },
  { href: "/auctions", label: "Auctions" },
  { href: "/exhibitions", label: "Exhibitions" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const isActive = isScrolled || isHovered || isMobileOpen;

  return (
    <>
      <motion.header
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out",
          isActive
            ? "bg-white/95 glass-nav shadow-[0_1px_20px_rgba(0,0,0,0.06)]"
            : "bg-transparent"
        )}
      >
        <nav className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-6 lg:px-12">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              src="/pandora.png"
              alt="PANDORA Logo"
              width={40}
              height={48}
              className={cn(
                "object-contain transition-all duration-500",
                isActive ? "" : "brightness-0 invert"
              )}
            />
            <span
              className={cn(
                "font-serif text-2xl font-bold tracking-[0.3em] transition-colors duration-500",
                isActive ? "text-pandora-charcoal" : "text-white"
              )}
            >
              PANDORA
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-10 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative text-[13px] font-medium uppercase tracking-[0.15em] transition-colors duration-500",
                  isActive
                    ? "text-pandora-gray hover:text-pandora-charcoal"
                    : "text-white/80 hover:text-white"
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute -bottom-1 left-0 h-[1px] w-0 transition-all duration-300",
                    isActive ? "bg-pandora-gold" : "bg-white",
                    "group-hover:w-full"
                  )}
                />
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className={cn(
                "hidden text-[13px] font-medium uppercase tracking-[0.1em] transition-colors duration-500 md:block",
                isActive
                  ? "text-pandora-gray hover:text-pandora-charcoal"
                  : "text-white/80 hover:text-white"
              )}
            >
              <span className="flex items-center gap-2">
                <User size={16} strokeWidth={1.5} />
                Sign In
              </span>
            </Link>

            {/* Mobile Toggle */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className={cn(
                "md:hidden transition-colors duration-500",
                isActive ? "text-pandora-charcoal" : "text-white"
              )}
              aria-label="Toggle menu"
            >
              {isMobileOpen ? (
                <X size={24} strokeWidth={1.5} />
              ) : (
                <Menu size={24} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden border-t border-pandora-cream bg-white md:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-6">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.3 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileOpen(false)}
                      className="block py-3 text-[14px] font-medium uppercase tracking-[0.15em] text-pandora-charcoal transition-colors hover:text-pandora-gold"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: navLinks.length * 0.08,
                    duration: 0.3,
                  }}
                  className="mt-4 border-t border-pandora-cream pt-4"
                >
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileOpen(false)}
                    className="flex items-center gap-2 py-3 text-[14px] font-medium uppercase tracking-[0.1em] text-pandora-charcoal transition-colors hover:text-pandora-gold"
                  >
                    <User size={16} strokeWidth={1.5} />
                    Sign In
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
