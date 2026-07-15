"use client";

import Link from "next/link";
import { Mail, MapPin, Phone, ArrowRight } from "lucide-react";

const footerLinks = {
  explore: [
    { href: "/collection", label: "Collection" },
    { href: "/auctions", label: "Auctions" },
    { href: "/about", label: "About Dynasity-Voult" },
  ],
  services: [
    { href: "/seller-hub", label: "Become a Seller" },
    { href: "/consign", label: "Consignment" },
    { href: "/appraisal", label: "Appraisal Services" },
    { href: "/venue-booking", label: "Venue Booking" },
    { href: "/provenance", label: "Provenance Verification" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/cookies", label: "Cookie Policy" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative bg-pandora-charcoal text-white">
      {/* Gold accent line */}
      <div className="divider-gold" />

      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        {/* Main Footer Content */}
        <div className="grid gap-12 py-20 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="font-serif text-2xl font-bold tracking-[0.3em] text-white"
            >
              DYNASITY-VOULT
            </Link>
            <p className="mt-6 max-w-xs text-[14px] leading-relaxed text-white/60">
              A premier digital heritage house dedicated to the curation,
              documentation, and transaction of historically significant
              artifacts.
            </p>

            {/* Contact Info */}
            <div className="mt-8 space-y-3">
              <a
                href="mailto:hello@dynasityvoult.house"
                className="flex items-center gap-3 text-[13px] text-white/50 transition-colors hover:text-pandora-gold-light"
              >
                <Mail size={14} strokeWidth={1.5} />
                hello@dynasityvoult.house
              </a>
              <a
                href="tel:+1234567890"
                className="flex items-center gap-3 text-[13px] text-white/50 transition-colors hover:text-pandora-gold-light"
              >
                <Phone size={14} strokeWidth={1.5} />
                +1 (234) 567-890
              </a>
              <span className="flex items-center gap-3 text-[13px] text-white/50">
                <MapPin size={14} strokeWidth={1.5} />
                London · New York · Dubai
              </span>
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Explore
            </h4>
            <ul className="mt-6 space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-white/60 transition-colors hover:text-pandora-gold-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Services
            </h4>
            <ul className="mt-6 space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-white/60 transition-colors hover:text-pandora-gold-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="lg:col-span-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Stay Informed
            </h4>
            <p className="mt-6 text-[14px] leading-relaxed text-white/60">
              Receive exclusive previews of upcoming auctions, new acquisitions,
              and exhibition invitations.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-6 flex gap-0"
            >
              <input
                type="email"
                placeholder="Your email address"
                className="w-full border border-white/10 bg-white/5 px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:border-pandora-gold-light focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="flex shrink-0 items-center justify-center bg-pandora-gold px-5 text-white transition-colors hover:bg-pandora-gold-light"
                aria-label="Subscribe"
              >
                <ArrowRight size={18} strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-8 md:flex-row">
          <p className="text-[12px] text-white/30">
            © {new Date().getFullYear()} Dynasity-Voult Digital Heritage House. All
            rights reserved.
          </p>
          <div className="flex gap-6">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] text-white/30 transition-colors hover:text-white/60"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
