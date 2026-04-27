"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { auctionItems } from "@/lib/auction-data";

export default function AuctionItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const item = auctionItems.find((i) => i.slug === slug);

  if (!item) {
    notFound();
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        backgroundColor: "black",
        color: "white",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* Logo Header */}
      <header
        className="w-full flex items-center justify-center py-4"
        style={{ backgroundColor: "black" }}
      >
        {/* <Image
          src="/pandora.png"
          alt="Pandora's Box Logo"
          width={100}
          height={120}
          className="object-cover"
        /> */}
      </header>

      {/* First Video */}
      {item.videos[0] && (
        <section className="w-full" style={{ margin: "0", marginTop: "-10px" }}>
          <video
            autoPlay
            muted
            className="w-full"
            style={{ borderRadius: "9px" }}
          >
            <source src={item.videos[0]} type="video/mp4" />
          </video>
        </section>
      )}

      {/* Product Info */}
      <section
        className="text-center"
        style={{
          width: "90%",
          maxWidth: "800px",
          margin: "1rem",
        }}
      >
        <h2 className="text-3xl font-serif mb-6">{item.title}</h2>
        <p
          className="text-base leading-relaxed"
          style={{ color: "white", fontFamily: "'Segoe UI'" }}
        >
          {item.description}
        </p>
      </section>

      {/* Second Video or Image Gallery */}
      {item.videos[1] ? (
        <section className="w-full" style={{ margin: "50px 0" }}>
          <video
            loop
            autoPlay
            muted
            className="w-full"
            style={{ borderRadius: "9px" }}
          >
            <source src={item.videos[1]} type="video/mp4" />
          </video>
        </section>
      ) : item.images.length > 0 ? (
        <section
          className="flex justify-center flex-wrap"
          style={{ gap: "4rem", margin: "3rem 0", maxWidth: "1000px" }}
        >
          {item.images.map((img, idx) => (
            <div key={idx} className="relative" style={{ height: "300px", width: "300px" }}>
              <Image
                src={img}
                alt={`${item.title} ${idx + 1}`}
                fill
                className="object-cover rounded-lg"
              />
            </div>
          ))}
        </section>
      ) : null}

      {/* Story Section */}
      <section
        className="text-center"
        style={{
          padding: "2rem",
          backgroundColor: "black",
          borderRadius: "8px",
          margin: "10px",
        }}
      >
        <h2 className="text-3xl font-serif font-bold mb-4">
          Legend of the Treasure
        </h2>
        <p
          style={{
            fontSize: "1.1rem",
            color: "white",
            maxWidth: "800px",
            margin: "0 auto",
            lineHeight: "1.6",
            fontFamily: "'Segoe UI'",
            marginBottom: "80px",
            marginTop: "30px",
          }}
        >
          {item.story}
        </p>
        <h2 className="text-2xl font-serif">
          Bid starts from - {item.startingBid}
        </h2>
      </section>

      {/* Bid Now Button */}
      <div className="text-center my-8">
        <Link
          href={`/auctions/${item.slug}/bid`}
          className="inline-block px-6 py-3 text-lg text-white rounded-md transition-colors"
          style={{
            backgroundColor: "#007BFF",
            textDecoration: "none",
            fontSize: "18px",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#0056b3")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#007BFF")
          }
        >
          Bid Now!
        </Link>
      </div>

      {/* Footer */}
      <footer
        className="w-full text-center py-4 mt-20"
        style={{
          backgroundColor: "black",
          color: "white",
          fontFamily: "'Segoe UI'",
        }}
      >
        <p>© 2025 Pandora&apos;s Box. All rights reserved.</p>
      </footer>
    </div>
  );
}
