# Database Setup Guide - Dynasity-Voult

## ✅ What's Been Set Up

I've created a complete database integration system for your Dynasity-Voult auction site:

### 1. **Database Files Created**
- `src/lib/supabase/db.ts` - All database operations (read/write)
- `src/lib/supabase/seed.ts` - Seed script to populate database
- `src/app/api/seed/artifacts/route.ts` - API endpoint to trigger seeding
- `src/app/api/products/route.ts` - Products API endpoints
- `src/app/admin/seed/page.tsx` - Admin UI to seed database
- `src/app/seller/add-product/page.tsx` - Updated to save products to database
- `src/app/seller/products/page.tsx` - View all products from database

---

## 🚀 Quick Start

### Step 1: Set Environment Variables
Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://gcnvqexnmcgfhnhzvbjd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key_here
```

Get these from Supabase Dashboard → Settings → API

### Step 2: Apply Schema to Database
1. Go to [Supabase Dashboard](https://supabase.com)
2. Select your project
3. Go to **SQL Editor** → **New Query**
4. Copy all SQL from `supabase/schema.sql`
5. Paste and click **Run**

### Step 3: Seed Your Database (Add Sample Products)
**Option A: Using Admin UI (Easiest)**
```
1. Start your dev server: npm run dev
2. Go to: http://localhost:3000/admin/seed
3. Click "🚀 Add Products to Database"
4. Check success message
```

**Option B: Using API**
```bash
curl -X POST http://localhost:3000/api/seed/artifacts
```

---

## 📋 Available Functions

### Reading Data (Client-side safe)
```typescript
import { 
  getAllArtifacts,
  getArtifactById,
  getArtifactsByCategory,
  searchArtifacts,
  getAllAuctions
} from "@/lib/supabase/db";

// Example: Get all products
const products = await getAllArtifacts();

// Example: Search products
const results = await searchArtifacts("Byzantine");

// Example: Get by category
const paintings = await getArtifactsByCategory("painting");
```

### Writing Data (Server-side only)
```typescript
import { 
  addArtifact,
  addArtifactsBulk,
  updateArtifact,
  deleteArtifact,
  addAuction
} from "@/lib/supabase/db";

// Example: Add single product
const product = await addArtifact({
  title: "Ancient Vase",
  description: "Beautiful ancient vase...",
  category: "antiquity",
  estimated_value: 5000,
  currency: "USD"
});

// Example: Add multiple products
const products = await addArtifactsBulk([...]);
```

---

## 🎯 Pages & Routes Created

| Page | Purpose | URL |
|------|---------|-----|
| Admin Seed UI | Add all products to DB | `/admin/seed` |
| Add Product | Upload new product | `/seller/add-product` |
| My Products | View all products | `/seller/products` |
| Products API | REST API for products | `/api/products` |

---

## 📦 Database Schema

### artifacts table
Stores all products/items with:
- title, description, origin, era
- category (painting, sculpture, etc.)
- images, thumbnail_url
- estimated_value, buy_now_price
- status (available, sold, on_auction, etc.)

### auctions table
Stores auction information:
- artifact_id (linked to artifacts)
- starting_bid, current_bid, reserve_price
- start_time, end_time
- status (upcoming, live, ended)

### profiles table
User accounts and roles

### bids table
Individual bids on auctions

---

## 🔧 Troubleshooting

**"Cannot read properties of undefined"**
- Make sure `.env.local` has correct Supabase URL and key

**"Permission denied"**
- Check that schema is applied (run schema.sql in Supabase SQL Editor)
- Ensure Row Level Security policies are created

**"Products not showing"**
- Run the seed endpoint first at `/admin/seed`
- Check browser console for errors

---

## 📝 Next Steps

1. ✅ Set environment variables
2. ✅ Apply schema to Supabase
3. ✅ Run seed at `/admin/seed`
4. Go to `/seller/products` to see your products
5. Add new products via `/seller/add-product`

---

**Your Supabase URL:** https://gcnvqexnmcgfhnhzvbjd.supabase.co
