"use client";

import { AnimatePresence, motion } from "motion/react";
import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCartStore } from "@/lib/cart-store";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice, clearCart } =
    useCartStore();
  const count = useCartStore((s) => s.totalItems());
  const total = totalPrice();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            key="cart-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-pandora-cream px-6 py-5">
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} strokeWidth={1.5} className="text-pandora-gold" />
                <h2 className="font-serif text-xl font-medium text-pandora-charcoal">
                  Your Cart
                </h2>
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-pandora-gold text-[10px] font-bold text-white">
                  {count}
                </span>
              </div>
              <button
                onClick={closeCart}
                className="rounded-full p-2 text-pandora-gray transition-colors hover:bg-pandora-cream hover:text-pandora-charcoal"
                aria-label="Close cart"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pandora-cream">
                    <ShoppingBag size={32} strokeWidth={1} className="text-pandora-gray-light" />
                  </div>
                  <p className="font-serif text-lg text-pandora-charcoal">Your cart is empty</p>
                  <p className="text-[13px] text-pandora-gray">
                    Browse the collection and add items you love.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex gap-4 rounded-lg border border-pandora-cream bg-pandora-warm-white p-3"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-md bg-pandora-cream">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="font-serif text-[15px] font-medium leading-tight text-pandora-charcoal">
                            {item.title}
                          </h3>
                          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-pandora-gray-light">
                            {item.category}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[14px] font-semibold text-pandora-gold">
                            {item.formattedPrice}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-pandora-cream text-pandora-gray transition-colors hover:border-pandora-gold hover:text-pandora-gold"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-5 text-center text-[13px] font-medium text-pandora-charcoal">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-pandora-cream text-pandora-gray transition-colors hover:border-pandora-gold hover:text-pandora-gold"
                              aria-label="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="ml-2 flex h-6 w-6 items-center justify-center rounded-full text-pandora-gray-light transition-colors hover:text-red-500"
                              aria-label="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-pandora-cream px-6 py-5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] uppercase tracking-wider text-pandora-gray">
                    Subtotal
                  </span>
                  <span className="font-serif text-xl font-semibold text-pandora-charcoal">
                    ${total.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-pandora-gray-light">
                  Taxes and shipping calculated at checkout
                </p>

                <button 
                  onClick={() => alert("Checkout flow to be implemented.")}
                  className="mt-5 w-full bg-pandora-charcoal py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-white transition-all hover:bg-pandora-gold"
                >
                  Proceed to Checkout
                </button>

                <button
                  onClick={clearCart}
                  className="mt-3 w-full py-2 text-[11px] uppercase tracking-[0.1em] text-pandora-gray-light transition-colors hover:text-red-500"
                >
                  Clear Cart
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}