"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutDashboard, Users, Settings, ClipboardList, ShoppingBag, UserCheck, ShieldCheck, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/seller-requests", label: "Seller Requests", icon: UserCheck },
  { href: "/admin/auction-applications", label: "Auction Applications", icon: ClipboardList },
  { href: "/admin/documents", label: "Verification Documents", icon: ShieldCheck },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/payouts", label: "Payout Clearance", icon: CreditCard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Main Menu
      </p>
      {sidebarLinks.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== "/admin" && pathname.startsWith(link.href));
        const Icon = link.icon;
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
            <Icon size={18} strokeWidth={1.5} />
            {link.label}
            {isActive && (
              <ChevronRight size={14} className="ml-auto" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
