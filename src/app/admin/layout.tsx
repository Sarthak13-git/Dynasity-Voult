import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebarNav from "./AdminSidebarNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Authenticate user session on the server
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // 2. Authorize role access on the server
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pandora-charcoal text-white font-serif text-sm font-bold">
            D
          </div>
          <div>
            <p className="font-serif text-base font-bold tracking-wider text-pandora-charcoal">
              Dynasity-Voult
            </p>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">
              Admin Panel
            </p>
          </div>
        </div>

        {/* Navigation (Client-interactive sidebar navigation component) */}
        <AdminSidebarNav />

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
