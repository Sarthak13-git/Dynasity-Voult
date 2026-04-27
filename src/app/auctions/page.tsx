import Image from "next/image";
import Link from "next/link";
import { auctionItems } from "@/lib/auction-data";

export const metadata = {
  title: "Auctions | PANDORA",
  description: "Explore our curated selection of extraordinary auction items.",
};

export default function AuctionsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header Image */}
      <div className="w-full pt-20">
        <img
          src="/auctions/luxury-items-showcase1.JPG"
          alt="Header Image"
          className="w-full block"
        />
      </div>

      {/* Horizontal Scrolling Category Section */}
      <section
        className="flex items-center gap-5 px-5 py-10 h-[500px] overflow-x-auto custom-scrollbar"
        style={{
          flexWrap: "nowrap",
          background: "linear-gradient(to right, #EAEAEA, #DBDBDB, #F2F2F2, #ADA996)",
          marginTop: "-255px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {auctionItems.map((item) => (
          <Link key={item.slug} href={`/auctions/${item.slug}`} className="block flex-shrink-0" style={{ textDecoration: 'none' }}>
            <div
              className="flex flex-col items-center rounded-lg text-center transition-transform duration-700 hover:scale-[1.13]"
              style={{
                background: "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(45,44,51,1) 100%, rgba(59,80,115,1) 100%, rgba(7,53,150,1) 100%, rgba(0,212,255,1) 100%)",
                height: "380px",
                width: "450px",
                marginLeft: "10px",
                marginRight: "20px"
              }}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-[300px] object-cover rounded-[4px]"
              />
              <h3
                className="text-white text-[22px] mt-2.5"
                style={{ fontFamily: "'Perpetua Titling MT', serif" }}
              >
                {item.title}
              </h3>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
