// Auction items data — converted from teammate's HTML project

export interface AuctionItem {
  slug: string;
  title: string;
  description: string;
  story: string;
  startingBid: string;
  image: string;
  images: string[];
  videos: string[];
}

export const auctionItems: AuctionItem[] = [
  {
    slug: "bugatti",
    title: 'Bugatti "La Voiture Noire"',
    description:
      "The Bugatti La Voiture Noire, a masterpiece of automotive design, exudes unmatched luxury and power. With a sleek, all-black carbon fiber body and a quad-turbocharged W16 engine delivering 1,479 horsepower, it stands as an icon of exclusivity. This rare model captivates collectors seeking the pinnacle of automotive elegance.",
    story:
      'Crafted to embody mystery and allure, the Bugatti La Voiture Noire is more than just a car; it\'s a modern legend. Inspired by Bugatti\'s lost 1930s masterpiece, the Type 57 SC Atlantic, this unique creation revives an era of elegance and exclusivity. La Voiture Noire—meaning "The Black Car"—combines artistry and ferocious power with its handcrafted carbon fiber body and unrivaled W16 engine. Only one exists, symbolizing Bugatti\'s ultimate devotion to craftsmanship and innovation.',
    startingBid: "15 Million $",
    image: "/auctions/labugatti.jpg",
    images: [],
    videos: ["/auctions/bugatti7.mp4", "/auctions/bugatti10.mp4"],
  },
  {
    slug: "enfield",
    title: "Royal Enfield KX",
    description:
      "The Royal Enfield KX, a timeless classic from the 1930s, represents the golden age of British motorcycling. With its powerful 1140cc V-twin engine and distinctive art deco styling, this rare machine is a crown jewel for vintage motorcycle collectors worldwide.",
    story:
      "Born in the legendary Redditch factory, the Royal Enfield KX was the flagship model of its era. Its massive V-twin engine and hand-crafted frame made it the choice of adventurers and gentlemen alike. Today, fewer than a handful survive in running condition, making each one a priceless piece of motorcycling heritage.",
    startingBid: "2.5 Million $",
    image: "/auctions/enfield5.webp",
    images: [
      "/auctions/enfield4.webp",
      "/auctions/enfield5.webp",
      "/auctions/enfield6.webp",
    ],
    videos: ["/auctions/enfieldmain.mp4"],
  },
  {
    slug: "amoria-ring",
    title: "Amoria Ring",
    description:
      "The Amoria Ring features a breathtaking pink diamond of exceptional clarity and brilliance, set in a handcrafted platinum band adorned with micro-pavé white diamonds. A true masterpiece of haute joaillerie.",
    story:
      "Discovered in the depths of an Australian mine, this rare pink diamond spent two years being cut and polished by master gem cutters to achieve its perfect radiance. The Amoria Ring represents the pinnacle of gemological artistry — a stone so rare that its kind appears only once in every ten million carats mined.",
    startingBid: "8 Million $",
    image: "/auctions/pink.jpg",
    images: [
      "/auctions/pinkston1.jpg",
      "/auctions/pinkstone2.jpg",
      "/auctions/pinkstone3.jpg",
    ],
    videos: ["/auctions/pinkvid.mp4"],
  },
  {
    slug: "skymoon",
    title: "PP Sky Moon Tourbillon",
    description:
      "The Patek Philippe Sky Moon Tourbillon is one of the most complicated wristwatches ever made, featuring a minute repeater, perpetual calendar, and a breathtaking celestial chart on its reverse dial showing the night sky over Geneva in real time.",
    story:
      "Crafted over years of painstaking work by Patek Philippe's most skilled watchmakers, the Sky Moon Tourbillon contains over 680 individual components. Each mechanism is finished by hand to the highest Geneva standards. This particular reference is among the rarest, with only a select few ever produced.",
    startingBid: "12 Million $",
    image: "/auctions/skymoon5.jpg",
    images: [
      "/auctions/skymoon5.jpg",
      "/auctions/skymoon7.jpg",
      "/auctions/skymoon8.jpg",
    ],
    videos: ["/auctions/watch6002r.mp4"],
  },
  {
    slug: "lotus-reverie",
    title: "Lotus Reverie",
    description:
      "Lotus Reverie is a monumental oil painting by a reclusive master, depicting luminous lotus flowers emerging from dark waters. The interplay of light and shadow creates an almost ethereal quality that has captivated art critics worldwide.",
    story:
      "Painted over the course of three years in a secluded studio, Lotus Reverie is considered the artist's magnum opus. The canvas measures over two meters in height, and the intricate brushwork reveals new details with every viewing. It has been exhibited only twice, both times to critical acclaim.",
    startingBid: "5 Million $",
    image: "/auctions/paintingrive1.jpg",
    images: [
      "/auctions/paintingrive1.jpg",
      "/auctions/paintingrive2.jpg",
      "/auctions/paintingrive3.jpg",
    ],
    videos: ["/auctions/lotusreverie.mp4"],
  },
  {
    slug: "imperator-aurum",
    title: "Imperator Aurum 1885",
    description:
      "The Imperator Aurum 1885 is a gold-embroidered shotgun of extraordinary craftsmanship. Every inch of its barrel and stock is adorned with hand-engraved gold inlay depicting hunting scenes and heraldic motifs.",
    story:
      "Commissioned by a European aristocrat in 1885, this shotgun was crafted by the finest gunsmiths of the era. The gold embroidery alone took over 2,000 hours to complete. Preserved in its original leather case, it remains in immaculate firing condition — a testament to the artisans who created it over a century ago.",
    startingBid: "3.5 Million $",
    image: "/auctions/gold-embroidered-shotgun-in-a-case.jpg",
    images: [
      "/auctions/gold-embroidered-shotgun-in-a-case.jpg",
      "/auctions/gold-embroidered-shotgun-2.jpg",
    ],
    videos: ["/auctions/shotgun.mp4"],
  },
];
