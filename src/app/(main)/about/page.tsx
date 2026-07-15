import { Metadata } from "next";
import Link from "next/link";
import { PREMIUM_AUCTION_THRESHOLD_LABEL } from "@/lib/constants";
import { 
  ShieldCheck, 
  FileCheck, 
  Lock, 
  Globe, 
  Award, 
  Sparkles, 
  Scale, 
  ArrowRight,
  TrendingUp,
  HelpCircle,
  ShoppingBag
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Dynasity-Voult",
  description: "Learn about Dynasity-Voult, the digital heritage marketplace connecting collectors, historians, and rare artifacts worldwide.",
};

const trustCards = [
  {
    icon: ShieldCheck,
    title: "Vetted Collectors",
    description: "Every collector and seller undergoes comprehensive validation to maintain platform integrity."
  },
  {
    icon: FileCheck,
    title: "Provenance Auditing",
    description: "Historical ownership, legal origin, and documentation are meticulously audited."
  },
  {
    icon: Lock,
    title: "Secure Escrow",
    description: "All transactions are secured by multi-party escrow contracts protecting buyer and seller funds."
  },
  {
    icon: Globe,
    title: "Global Connectivity",
    description: "Connecting institutional curators, museums, and private collectors across the globe."
  }
];

const standardsCards = [
  {
    icon: Award,
    title: "Authenticity Verification",
    description: "Independent experts validate physical attributes, age estimates, and artist signatures before listing."
  },
  {
    icon: Sparkles,
    title: "Provenance Documentation",
    description: "Exhaustive lineage checking ensures legal title transfer and protects against illicit antiquities trade."
  },
  {
    icon: Lock,
    title: "Secure Transactions",
    description: "Strict bank-grade verification, identity check, and funds escrow shield premium asset transfers."
  },
  {
    icon: Scale,
    title: "Curated Marketplace",
    description: "Every item on our platform is hand-selected and reviewed by the Dynasity-Voult curation team."
  }
];

const faqItems = [
  {
    question: "What is the difference between the Direct Marketplace and Premium Auctions?",
    answer: `Artifacts valued below ${PREMIUM_AUCTION_THRESHOLD_LABEL} are sold directly via our Direct Marketplace under 'Buy Now' terms. Masterpieces valued above ${PREMIUM_AUCTION_THRESHOLD_LABEL} are placed in our curated Premium Auction Program, subject to approval by the Dynasity-Voult Auction Team.`
  },
  {
    question: "Can I list an artifact for auction directly?",
    answer: "No. In order to protect the curation standards of our Premium Auction Program, sellers cannot directly publish auctions. All auction submissions undergo strict historical auditing and require explicit authorization from our curation committee."
  },
  {
    question: "How is authenticity verified?",
    answer: "We partner with leading independent historians, physical material testing labs, and certified appraisers. Every item listed undergoes thorough material, stylistic, and provenance audit before publishing."
  },
  {
    question: "What are the fees for buyers and sellers?",
    answer: "Our standard marketplace commission is structured based on the asset class and value. Detailed information on platform commission, shipping logistics, and escrow fees can be retrieved from our Seller Hub."
  },
  {
    question: "How are high-value physical shipments handled?",
    answer: "We coordinate white-glove, insured art-transit logistics globally. Artifacts remain secured in climate-controlled partner vaults or under verified custody until transaction verification is finalized."
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-pandora-ivory pt-24 pb-20 px-6 sm:px-8 lg:px-12">
      <div className="max-w-5xl mx-auto space-y-20">
        
        {/* Hero Section */}
        <section className="text-center space-y-6 pt-8">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-pandora-charcoal">
            Our Heritage & Vision
          </h1>
          <div className="divider-gold max-w-md mx-auto" />
          <p className="max-w-2xl mx-auto text-lg text-pandora-gray leading-relaxed font-sans text-balance">
            Dynasity-Voult is a premier digital heritage marketplace dedicated to the preservation, 
            documentation, and transaction of rare artifacts, collectibles, and historical treasures.
          </p>
        </section>

        {/* Story & Mission Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white border border-pandora-cream p-8 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-pandora-charcoal flex items-center gap-2">
              <Award className="text-pandora-gold h-6 w-6" />
              Company Story
            </h2>
            <p className="text-[14px] text-pandora-gray leading-relaxed font-sans">
              Founded as a digital bridge between antiquity and the modern era, Dynasity-Voult provides 
              a premium, secure environment for trading assets of exceptional cultural and historical value. 
              We blend state-of-the-art escrow cryptography with classical provenance auditing to assure authenticity.
            </p>
          </div>

          <div className="bg-white border border-pandora-cream p-8 rounded-2xl shadow-sm space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-pandora-charcoal flex items-center gap-2">
              <Globe className="text-pandora-gold h-6 w-6" />
              Our Mission
            </h2>
            <p className="text-[14px] text-pandora-gray leading-relaxed font-sans">
              Our mission is to preserve global history by connecting institutional curators, museums, 
              and discerning private collectors. By ensuring that every transaction honors the true provenance 
              and lineage of the artifact, we ensure human heritage remains accessible and safeguarded.
            </p>
          </div>
        </section>

        {/* Business Model Section */}
        <section className="bg-white border border-pandora-cream p-8 sm:p-10 rounded-2xl shadow-sm space-y-8">
          <div className="text-center space-y-3">
            <h2 className="font-serif text-3xl font-medium text-pandora-charcoal">
              How Dynasity-Voult Works
            </h2>
            <p className="text-sm text-pandora-gray max-w-xl mx-auto">
              Our platform operates on a split business model tailored to the value and rarity of the items.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="border-r border-pandora-cream md:pr-8 space-y-4 text-center md:text-left">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-pandora-ivory text-pandora-charcoal mx-auto md:mx-0">
                <ShoppingBag className="h-6 w-6 text-pandora-gold" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-pandora-charcoal">
                Direct Marketplace
              </h3>
              <p className="text-[14px] text-pandora-gray leading-relaxed">
                Artifacts valued **below {PREMIUM_AUCTION_THRESHOLD_LABEL}** are listed directly in our retail catalog. 
                Buyers can acquire these immediately using the **Buy Now** checkout system, protected by 
                standard secure payment gateways.
              </p>
              <Link 
                href="/buy" 
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pandora-gold hover:text-pandora-gold-light transition-colors"
              >
                Browse Shop <ArrowRight size={12} />
              </Link>
            </div>

            <div className="md:pl-4 space-y-4 text-center md:text-left">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-pandora-ivory text-pandora-charcoal mx-auto md:mx-0">
                <TrendingUp className="h-6 w-6 text-pandora-gold" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-pandora-charcoal">
                Premium Auction Program
              </h3>
              <p className="text-[14px] text-pandora-gray leading-relaxed">
                Masterpieces valued **above {PREMIUM_AUCTION_THRESHOLD_LABEL}** are routed into our exclusive bidding cycles. 
                Sellers **cannot directly start auctions**. All auction listings must be requested, audited, 
                and approved by the *Dynasity-Voult Auction Team*.
              </p>
              <Link 
                href="/auctions" 
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-pandora-gold hover:text-pandora-gold-light transition-colors"
              >
                View Live Auctions <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>

        {/* Why Trust Us Section */}
        <section className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="font-serif text-3xl font-medium text-pandora-charcoal">
              Why Trust Us
            </h2>
            <p className="text-sm text-pandora-gray max-w-xl mx-auto">
              Safeguarding the legacy of humanity is our primary responsibility.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="bg-white border border-pandora-cream p-6 rounded-xl shadow-xs space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pandora-ivory text-pandora-gold">
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-pandora-charcoal">
                    {card.title}
                  </h3>
                  <p className="text-[13px] text-pandora-gray leading-relaxed">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Our Standards Section */}
        <section className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="font-serif text-3xl font-medium text-pandora-charcoal">
              Our Standards
            </h2>
            <p className="text-sm text-pandora-gray max-w-xl mx-auto">
              Every artifact undergoes meticulous auditing and verification before being accepted on the platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {standardsCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="bg-white border border-pandora-cream p-6 rounded-xl shadow-xs space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pandora-cream/30 text-pandora-gold">
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-pandora-charcoal">
                    {card.title}
                  </h3>
                  <p className="text-[13px] text-pandora-gray leading-relaxed">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Disclaimer Section */}
        <section className="bg-amber-50/50 border border-amber-200/50 p-6 sm:p-8 rounded-2xl text-center max-w-3xl mx-auto">
          <p className="text-[13px] text-amber-800 leading-relaxed font-medium italic">
            &ldquo;Not every submitted artifact is accepted for auction. Premium auction placement is subject 
            to authenticity review, provenance verification, historical significance, and auction committee approval.&rdquo;
          </p>
        </section>

        {/* FAQ Section */}
        <section className="space-y-8">
          <div className="text-center space-y-3">
            <h2 className="font-serif text-3xl font-medium text-pandora-charcoal">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-pandora-gray max-w-xl mx-auto">
              Find answers to common questions regarding our verification, security, and auction procedures.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqItems.map((item, index) => (
              <details 
                key={index} 
                className="group bg-white border border-pandora-cream rounded-xl shadow-xs [&_summary::-webkit-details-marker]:hidden overflow-hidden transition-all duration-300"
              >
                <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer select-none text-pandora-charcoal hover:bg-pandora-ivory/50 transition-colors">
                  <h3 className="text-[14px] font-semibold tracking-wide">
                    {item.question}
                  </h3>
                  <HelpCircle className="h-5 w-5 shrink-0 text-pandora-gold-light group-open:rotate-180 transition-transform duration-300" />
                </summary>
                <div className="px-5 pb-5 pt-1 border-t border-pandora-cream/40">
                  <p className="text-[13px] text-pandora-gray leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-8 bg-pandora-charcoal text-white py-16 px-8 rounded-2xl border border-pandora-gold/20 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 h-48 w-48 bg-gradient-to-br from-pandora-gold/10 to-transparent blur-3xl rounded-full" />
          
          <div className="relative space-y-4 max-w-xl mx-auto">
            <h2 className="font-serif text-3xl font-medium tracking-wide">
              Begin Your Collecting Journey
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Explore ancient and historically significant treasures in our direct catalog, 
              or consign your own masterpiece for authentication.
            </p>
          </div>

          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/collection"
              className="w-full sm:w-auto bg-pandora-gold hover:bg-pandora-gold-light text-white px-8 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors"
            >
              Explore Collection
            </Link>
            
            <Link
              href="/seller-hub"
              className="w-full sm:w-auto border border-white/20 bg-transparent hover:bg-white/5 text-white px-8 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors"
            >
              Become a Seller
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
