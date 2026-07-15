"use client";

import { usePathname, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/layout/CartDrawer";
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lock } from "lucide-react";

const protectedRoutes = [
  "/collection",
  "/exhibitions",
  "/seller-hub",
  "/consign",
  "/appraisal",
  "/venue-booking",
  "/provenance",
  "/seller",
  "/buyer",
  "/orders",
  "/profile",
  "/admin"
];

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Verify user session validity with server
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        setUser(null);
      } else {
        setUser(user);
      }
      setCheckingAuth(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Don't show Navbar/Footer on admin and seller pages
  const isDashboard = pathname.startsWith("/admin") || pathname.startsWith("/seller");

  // Check if pathname is restricted
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  const showLockModal = isProtected && !user && !checkingAuth;

  const isProductDetail = /^\/buy\/[^\/]+$/.test(pathname);

  // Don't show Navbar/Footer on admin, seller, auth pages, product details, or restricted pages when not logged in
  const hideHeaderFooter = 
    isDashboard || 
    isProductDetail ||
    pathname.startsWith("/login") || 
    pathname.startsWith("/signup") || 
    pathname.startsWith("/callback") || 
    pathname.startsWith("/reset") || 
    showLockModal ||
    (!user && isProtected);

  return (
    <>
      <div className={showLockModal ? "filter blur-sm select-none pointer-events-none transition-all duration-300" : ""}>
        {!hideHeaderFooter && <Navbar />}
        <main>{children}</main>
        {!hideHeaderFooter && <Footer />}
        <CartDrawer />
      </div>

      {showLockModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-2xl border border-pandora-cream mx-4 animate-fade-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pandora-ivory mb-6 text-pandora-gold border border-pandora-cream">
              <Lock className="h-6 w-6" />
            </div>
            
            <h3 className="font-serif text-xl font-medium text-pandora-charcoal mb-3">
              Authentication Required
            </h3>
            
            <p className="text-[14px] text-pandora-gray mb-8">
              Sign in to access options
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push(`/login?redirect=${pathname}`)}
                className="w-full bg-pandora-charcoal py-3 text-[12px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-pandora-gold"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full border border-gray-200 py-3 text-[12px] font-semibold uppercase tracking-[0.15em] text-gray-700 transition-colors hover:bg-gray-50"
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
