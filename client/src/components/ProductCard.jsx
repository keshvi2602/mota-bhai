import { Minus, Plus, ShoppingCart } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { formatCurrency } from "../utils/whatsapp.js";

export function ProductCard({ addToCartText = "Add to Cart", cartQuantity = 0, onQuantityChange, product, onAddToCart }) {
  const rotateX = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const imageScale = useTransform(rotateX, [-12, 12], [1.01, 1.05]);
  const discountMoney = Number(product.discountMoney || 0);
  const finalPrice = Math.max(Number(product.price || 0) - discountMoney, 0);
  const tag = product.tag || product.tags?.[0] || "New Arrival";

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    rotateX.set(((y / rect.height) - 0.5) * -16);
    rotateY.set(((x / rect.width) - 0.5) * 16);
  }

  function handlePointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.article
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileHover={{ y: -10 }}
      className="group flex h-full min-h-[19rem] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition hover:shadow-xl sm:min-h-[28rem] sm:p-3"
    >
      <div className="overflow-hidden rounded-xl bg-slate-100">
        <div className="relative aspect-square sm:aspect-[4/5]">
          <motion.img
            style={{ scale: imageScale }}
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain p-2 transition duration-500 sm:p-3"
          />
          <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-emerald-700 px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-white shadow sm:left-3 sm:top-3 sm:px-3 sm:text-xs sm:tracking-[0.12em]">
            {tag}
          </span>
          {discountMoney > 0 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-sovereign px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-obsidian shadow sm:bottom-3 sm:right-3 sm:text-xs">
              Save {formatCurrency(discountMoney)}
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-2 sm:p-3">
        <div className="min-w-0">
          <p className="line-clamp-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-emerald-700 sm:text-xs sm:tracking-[0.16em]">{product.category}</p>
          <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#172337] sm:mt-2 sm:min-h-14 sm:text-lg sm:leading-7">{product.name}</h3>
          <p className="mt-2 hidden min-h-12 text-sm leading-6 text-slate-600 sm:line-clamp-2">{product.description}</p>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-3 sm:min-h-[3.25rem] sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:pt-4">
          <div className="min-w-0">
            <strong className="block text-base font-black text-[#172337] sm:text-xl">{formatCurrency(finalPrice)}</strong>
            {discountMoney > 0 && (
              <span className="text-xs font-bold text-slate-500 line-through">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
          {cartQuantity > 0 && onQuantityChange ? (
            <div className="flex w-full items-center justify-between rounded-full bg-[#172337] p-1 text-white sm:w-auto sm:justify-center sm:gap-2">
              <button type="button" onClick={() => onQuantityChange(product.id || product._id, -1)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 sm:h-9 sm:w-9" aria-label={`Decrease ${product.name}`}>
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-6 text-center text-sm font-black">{cartQuantity}</span>
              <button type="button" onClick={() => onQuantityChange(product.id || product._id, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 sm:h-9 sm:w-9" aria-label={`Increase ${product.name}`}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={(event) => onAddToCart(product, event)}
              className="inline-flex h-10 w-full min-w-0 shrink-0 items-center justify-center gap-2 rounded-full bg-sovereign px-3 text-[0.72rem] font-black text-obsidian shadow transition hover:brightness-105 sm:h-12 sm:w-auto sm:min-w-[8.5rem] sm:px-4 sm:text-sm"
              style={{ backgroundColor: "var(--button-color)" }}
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span className="truncate">{addToCartText}</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
