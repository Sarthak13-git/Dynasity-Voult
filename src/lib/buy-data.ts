// Buy page items — 10 curated marketplace items
// Place your product images in /public/buy/ folder and update the `image` paths below.

export interface BuyItem {
  id: string;
  title: string;
  description: string;
  price: number;
  formattedPrice: string;
  origin: string;
  era: string;
  image: string;
  category: string;
}

export const buyItems: BuyItem[] = [
  {
    id: "byzantine-cross",
    title: "Byzantine Gold Pectoral Cross",
    description:
      "An exquisite gold pectoral cross from the Byzantine Empire, featuring intricate filigree work and inlaid garnets. This remarkable piece served as a symbol of faith and authority for high-ranking clergy.",
    price: 580000,
    formattedPrice: "$580,000",
    origin: "Constantinople",
    era: "6th Century AD",
    image: "/buy/item-1.jpg",
    category: "Antiquities",
  },
  {
    id: "ming-jade-dragon",
    title: "Ming Dynasty Jade Dragon",
    description:
      "A masterfully carved nephrite jade dragon sculpture from the Ming Dynasty. The sinuous form and translucent green stone exemplify the pinnacle of Chinese jade carving artistry.",
    price: 1450000,
    formattedPrice: "$1,450,000",
    origin: "China",
    era: "15th Century",
    image: "/buy/item-2.jpg",
    category: "Sculptures",
  },
  {
    id: "flemish-manuscript",
    title: "Illuminated Book of Hours",
    description:
      "A Flemish illuminated manuscript with lavish gold leaf decorations and vivid miniature paintings. Each page is a testament to medieval artistic devotion and craftsmanship.",
    price: 420000,
    formattedPrice: "$420,000",
    origin: "Bruges, Flanders",
    era: "c. 1480",
    image: "/buy/item-3.jpg",
    category: "Manuscripts",
  },
  {
    id: "samurai-katana",
    title: "Edo Period Samurai Katana",
    description:
      "A superbly preserved katana with a folded-steel blade by master swordsmith Tadayoshi. The tsuba features gold inlay depicting a crane in flight, and the scabbard is lacquered with gold dust.",
    price: 890000,
    formattedPrice: "$890,000",
    origin: "Japan",
    era: "17th Century",
    image: "/buy/item-4.jpg",
    category: "Arms & Armor",
  },
  {
    id: "egyptian-scarab",
    title: "Royal Egyptian Scarab Amulet",
    description:
      "A large lapis lazuli scarab amulet inscribed with hieroglyphics bearing the cartouche of a pharaoh. Exceptional preservation with vivid blue stone and gold-leaf detailing.",
    price: 320000,
    formattedPrice: "$320,000",
    origin: "Thebes, Egypt",
    era: "18th Dynasty",
    image: "/buy/item-5.jpg",
    category: "Antiquities",
  },
  {
    id: "venetian-mirror",
    title: "Venetian Etched Glass Mirror",
    description:
      "An ornate Murano glass mirror with hand-etched floral motifs and gilt-bronze frame. This piece once adorned the private chambers of a Venetian palazzo along the Grand Canal.",
    price: 275000,
    formattedPrice: "$275,000",
    origin: "Venice, Italy",
    era: "18th Century",
    image: "/buy/item-6.jpg",
    category: "Decorative Arts",
  },
  {
    id: "persian-rug",
    title: "Safavid Silk Court Carpet",
    description:
      "A museum-quality silk carpet with over 800 knots per square inch, featuring a central medallion design in indigo, crimson, and gold. Woven in the royal workshops of Isfahan.",
    price: 1200000,
    formattedPrice: "$1,200,000",
    origin: "Isfahan, Persia",
    era: "17th Century",
    image: "/buy/item-7.jpg",
    category: "Textiles",
  },
  {
    id: "roman-bust",
    title: "Marble Bust of Emperor Hadrian",
    description:
      "A near-complete Roman marble portrait bust of Emperor Hadrian with remarkably preserved facial features. Traces of original polychrome pigment remain on the hair and laurel wreath.",
    price: 2100000,
    formattedPrice: "$2,100,000",
    origin: "Rome, Italy",
    era: "2nd Century AD",
    image: "/buy/item-8.jpg",
    category: "Sculptures",
  },
  {
    id: "faberge-egg",
    title: "Imperial Fabergé Easter Egg",
    description:
      "A jewelled Easter egg crafted by the House of Fabergé in gold, enamel, and precious stones. The surprise mechanism reveals a miniature golden carriage with functioning wheels.",
    price: 3800000,
    formattedPrice: "$3,800,000",
    origin: "St. Petersburg, Russia",
    era: "c. 1900",
    image: "/buy/item-9.jpg",
    category: "Objets d'Art",
  },
  {
    id: "aztec-calendar",
    title: "Aztec Obsidian Calendar Stone",
    description:
      "A rare volcanic obsidian disc carved with the Aztec calendar motif, featuring Tonatiuh at center surrounded by the four previous suns. Exceptional craftsmanship with mirror-polished surface.",
    price: 950000,
    formattedPrice: "$950,000",
    origin: "Tenochtitlan, Mexico",
    era: "15th Century",
    image: "/buy/item-10.jpg",
    category: "Antiquities",
  },
];