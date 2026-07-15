import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shield, Sparkles, TrendingUp, Landmark } from "lucide-react";

export default async function SellerHubPage() {
  const supabase = await createClient();
  
  // Fetch session to check if user is already logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, store_name")
      .eq("id", user.id)
      .single();

    if (profile && (profile.role === "seller" || profile.role === "admin") && profile.store_name) {
      redirect("/seller");
    }
  }

  const benefits = [
    {
      icon: Shield,
      title: "Hardened Security & RLS",
      description: "Enjoy bank-grade Row-Level Security protecting all your product catalogs and transactions.",
    },
    {
      icon: Sparkles,
      title: "Global Antique Collector Base",
      description: "Direct access to thousands of verified historical artifact collectors and antique curators.",
    },
    {
      icon: TrendingUp,
      title: "Real-time Bidding Engine",
      description: "List items on live auctions backed by serializable concurrency control locks.",
    },
    {
      icon: Landmark,
      title: "Digital Heritage House",
      description: "A premium storefront tailored for high-value preservation and antique dealer networks.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl py-6 text-center">
      {/* Hero Header */}
      <h1 className="font-serif text-4xl font-bold tracking-tight text-pandora-charcoal sm:text-5xl">
        Join Dynasity-Voult Seller Hub
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-pandora-gray">
        Become a partner of the world's premier digital heritage house. Showcase, auction, and transact historic artifacts with absolute trust.
      </p>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/seller-hub/onboarding"
          className="w-full rounded-lg bg-pandora-charcoal px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white hover:bg-pandora-gold transition-colors sm:w-auto"
        >
          Become a Seller
        </Link>
      </div>

      {/* Benefits grid */}
      <div className="mt-16 grid gap-8 sm:grid-cols-2 text-left">
        {benefits.map((benefit, index) => {
          const IconComponent = benefit.icon;
          return (
            <div key={index} className="rounded-xl border border-pandora-cream bg-white p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pandora-ivory text-pandora-gold">
                <IconComponent size={20} />
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-pandora-charcoal">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-pandora-gray">
                {benefit.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
