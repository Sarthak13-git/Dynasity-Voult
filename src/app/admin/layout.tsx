"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Gavel,
  Users,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/auctions", label: "Auctions", icon: Gavel },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pandora-charcoal text-white font-serif text-sm font-bold">
            P
          </div>
          <div>
            <p className="font-serif text-base font-bold tracking-wider text-pandora-charcoal">
              PANDORA
            </p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">
              Admin Panel
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
              (link.href !== "/admin" && pathname.startsWith(link.href));
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
            Exit Admin
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-8 backdrop-blur-md">
          <div>
            <p className="text-[13px] text-gray-400">
              Welcome back, <span className="text-pandora-charcoal font-medium">Admin</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pandora-charcoal text-xs font-semibold text-white">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
