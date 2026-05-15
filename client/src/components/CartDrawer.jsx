import { Minus, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { API_URL } from "../utils/api.js";
import { createWhatsAppOrderUrl, formatCurrency } from "../utils/whatsapp.js";

function WhatsAppLogo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-5 w-5 fill-white">
      <path d="M16.04 3.2A12.67 12.67 0 0 0 5.3 22.6L3.6 28.8l6.35-1.66A12.68 12.68 0 1 0 16.04 3.2Zm0 2.33a10.35 10.35 0 0 1 8.8 15.8 10.31 10.31 0 0 1-13.96 3.55l-.45-.27-3.77.99 1-3.67-.3-.47A10.35 10.35 0 0 1 16.04 5.53Zm-4.03 4.9c-.23 0-.6.08-.92.43-.31.34-1.21 1.18-1.21 2.88s1.24 3.35 1.41 3.58c.18.23 2.4 3.83 5.93 5.22 2.93 1.16 3.53.93 4.17.87.64-.06 2.07-.84 2.36-1.66.29-.81.29-1.51.2-1.66-.08-.14-.32-.23-.67-.4-.35-.17-2.07-1.02-2.39-1.13-.32-.12-.55-.18-.78.17-.23.35-.9 1.13-1.1 1.36-.2.23-.4.26-.75.09-.35-.18-1.47-.54-2.8-1.72-1.04-.92-1.74-2.06-1.94-2.41-.2-.35-.02-.54.15-.72.16-.15.35-.41.52-.61.18-.2.23-.35.35-.58.12-.23.06-.43-.03-.61-.08-.17-.78-1.88-1.07-2.58-.28-.67-.57-.58-.78-.59h-.66Z" />
    </svg>
  );
}

export function CartDrawer({ cart, cartCount, cartTotal, content, isOpen, onClose, onQuantityChange }) {
  const [customer, setCustomer] = useState({
    address: "",
    name: "",
    note: "",
    phone: ""
  });
  const [message, setMessage] = useState("");

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  async function handleWhatsAppCheckout() {
    if (!cart.length) return;
    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      setMessage("Please add your name, mobile number, and delivery address.");
      return;
    }
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        body: JSON.stringify({ customer, items: cart }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Could not save order. Please try again.");
      }
    } catch (error) {
      setMessage(error.message || "Could not save order. Please try again.");
      return;
    }
    window.location.href = createWhatsAppOrderUrl(cart, cartTotal, customer, content?.whatsappNumber);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            aria-label="Close cart"
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="premium-scrollbar fixed bottom-0 right-0 top-0 z-[70] flex w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-obsidian/95 p-6 shadow-premium backdrop-blur-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-sovereign">Private Cart</p>
                <h2 className="mt-2 text-3xl font-black text-white">Your Order</h2>
                <p className="mt-1 text-sm text-slate-400">{cartCount} total items selected</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/10 p-3 text-white transition hover:border-sovereign/60"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8 flex-1 space-y-4">
              {cart.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-slate-400">
                  {content?.cartEmptyMessage || "Your cart is waiting for something special."}
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex gap-4">
                      <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-white">{item.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.name} x {item.quantity} - {formatCurrency(item.price * item.quantity)}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            onClick={() => onQuantityChange(item.id, -1)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"
                            aria-label={`Decrease ${item.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-5 text-center font-black text-champagne">{item.quantity}</span>
                          <button
                            onClick={() => onQuantityChange(item.id, 1)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"
                            aria-label={`Increase ${item.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 rounded-3xl border border-sovereign/30 bg-white/[0.07] p-5">
              <div className="mb-5 space-y-3">
                <input
                  value={customer.name}
                  onChange={(event) => updateCustomer("name", event.target.value)}
                  placeholder="Customer name"
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sovereign/60"
                />
                <input
                  value={customer.phone}
                  onChange={(event) => updateCustomer("phone", event.target.value)}
                  placeholder="Mobile number"
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sovereign/60"
                />
                <textarea
                  value={customer.address}
                  onChange={(event) => updateCustomer("address", event.target.value)}
                  placeholder="Delivery address in Germany"
                  rows="3"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sovereign/60"
                />
                <input
                  value={customer.note}
                  onChange={(event) => updateCustomer("note", event.target.value)}
                  placeholder="Note, if any"
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sovereign/60"
                />
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Total Items</span>
                <strong className="text-white">{cartCount}</strong>
              </div>
              <div className="mt-3 flex items-center justify-between text-slate-300">
                <span>Total Amount</span>
                <strong className="text-2xl text-champagne">{formatCurrency(cartTotal)}</strong>
              </div>
              <button
                onClick={handleWhatsAppCheckout}
                disabled={!cart.length}
                className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-whatsapp px-5 py-4 text-base font-black text-white shadow-[0_18px_45px_rgba(37,211,102,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <WhatsAppLogo />
                {content?.checkoutButtonText || "Place Order on WhatsApp"}
              </button>
              {message && <p className="mt-3 text-sm font-bold text-champagne">{message}</p>}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
