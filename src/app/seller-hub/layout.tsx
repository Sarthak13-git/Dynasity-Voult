import React from "react";
import Link from "next/link";

export default function SellerHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-pandora-ivory text-pandora-charcoal">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b border-pandora-cream bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link
            href="/"
            className="font-serif text-2xl font-bold tracking-[0.2em] text-pandora-charcoal transition-colors hover:text-pandora-gold"
          >
            Dynasity-Voult
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider text-pandora-gray hover:text-pandora-charcoal transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        {children}
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-pandora-cream bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-xs text-pandora-gray-light lg:px-10">
          <p>© {new Date().getFullYear()} Dynasity-Voult. All rights reserved. Partner Portal.</p>
        </div>
      </footer>
    </div>
  );
}
