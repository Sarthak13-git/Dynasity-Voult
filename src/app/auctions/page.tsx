import Image from "next/image";
import Link from "next/link";
import { auctionItems } from "@/lib/auction-data";

export const metadata = {
  title: "Auctions | PANDORA",
  description: "Explore our curated selection of extraordinary auction items.",
};

export default function AuctionsPage() {
  return (
    <div className="min-h-screen bg-pandora-ivory pt-28 pb-20">
      {/* Header Image */}
      <div className="relative w-full h-[350px] overflow-hidden">
        <Image
          src="/auctions/luxury-items-showcase1.JPG"
          alt="Luxury items showcase"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Products Grid */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 mt-16">
        <section
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          style={{
            background:
              "linear-gradient(to right, #EAEAEA, #DBDBDB, #F2F2F2, #ADA996)",
            padding: "40px 20px",
            borderRadius: "8px",
          }}
        >
          {auctionItems.map((item) => (
            <Link
              key={item.slug}
              href={`/auctions/${item.slug}`}
              className="block group"
            >
              <div
                className="flex flex-col items-center text-center rounded-lg overflow-hidden transition-transform duration-700 hover:scale-105"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(45,44,51,1) 100%)",
                  height: "380px",
                }}
              >
                <div className="relative w-full h-[300px]">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <h3 className="text-white font-serif text-lg mt-3 px-2">
                  {item.title}
                </h3>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
