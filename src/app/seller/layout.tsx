"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  Package,
  Settings,
  LogOut,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated (you can replace with actual auth check)
    const checkAuth = () => {
      // Simulate auth check - replace with actual Supabase session check
      const isLoggedIn = localStorage.getItem("authToken") || true; // Set to true for demo since auth isn't fully set up
      const sellerInfo = localStorage.getItem("sellerInfo");

      setIsAuthenticated(!!isLoggedIn);
      setIsRegistered(!!sellerInfo);
      setLoading(false);

      // Redirect if not authenticated
      if (!isLoggedIn) {
        router.push("/login?redirect=/seller");
        return;
      }

      // Redirect to registration if authenticated but not registered (except on register page)
      if (!sellerInfo && !pathname.includes("/register")) {
        router.push("/seller/register");
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pandora-charcoal"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If on register page, show children without sidebar
  if (pathname.includes("/register")) {
    return children;
  }

  if (!isAuthenticated || !isRegistered) {
    return null;
  }

  const sidebarLinks = [
    { href: "/seller", label: "Dashboard", icon: LayoutDashboard },
    { href: "/seller/products", label: "My Products", icon: Package },
    { href: "/seller/add-product", label: "Add Product", icon: Plus },
    { href: "/seller/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-6">
          <img
            src="/pandora.png"
            alt="PANDORA Logo"
            className="h-9 w-auto brightness-0"
          />
          <div>
            <p className="font-serif text-sm font-bold tracking-wider text-pandora-charcoal">
              PANDORA
            </p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">
              Seller Hub
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Main Menu
          </p>
          {sidebarLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/seller" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                  isActive
                    ? "bg-pandora-charcoal text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-pandora-charcoal"
                )}
              >
                <link.icon size={18} strokeWidth={1.5} />
                {link.label}
                {isActive && (
                  <ChevronRight size={14} className="ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-100 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-red-500"
          >
            <LogOut size={18} strokeWidth={1.5} />
            Exit Seller
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-8 backdrop-blur-md">
          <div>
            <p className="text-[13px] text-gray-400">
              Welcome back, <span className="text-pandora-charcoal font-medium">Seller</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/seller/add-product"
              className="flex items-center gap-2 rounded-lg bg-pandora-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-pandora-charcoal/80 transition-colors"
            >
              <Plus size={18} strokeWidth={1.5} />
              <span>Add Product</span>
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pandora-charcoal text-xs font-semibold text-white">
              S
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
