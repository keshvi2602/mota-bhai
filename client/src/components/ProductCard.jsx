import { Minus, Plus, ShoppingCart } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { formatCurrency } from "../utils/whatsapp.js";

export function ProductCard({ addToCartText = "Add to Cart", cartQuantity = 0, onQuantityChange, product, onAddToCart }) {
  const rotateX = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const imageScale = useTransform(rotateX, [-12, 12], [1.04, 1.1]);
  const discountMoney = Number(product.discountMoney || 0);
  const finalPrice = Math.max(Number(product.price || 0) - discountMoney, 0);

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
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-xl"
    >
      <div className="overflow-hidden rounded-xl bg-slate-100">
        <div className="relative aspect-[4/5]">
          <motion.img
            style={{ scale: imageScale }}
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500"
          />
          <span className="absolute left-3 top-3 rounded-full bg-emerald-700 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white shadow">
            {product.tag}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{product.category}</p>
          <h3 className="mt-2 line-clamp-2 min-h-14 text-lg font-black leading-7 text-[#172337]">{product.name}</h3>
          <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">{product.description}</p>
        </div>

        <div className="mt-auto flex min-h-[3.25rem] items-end justify-between gap-4 pt-4">
          <div>
            <strong className="block text-xl font-black text-[#172337]">{formatCurrency(finalPrice)}</strong>
            {discountMoney > 0 && (
              <span className="text-xs font-bold text-slate-500 line-through">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
          {cartQuantity > 0 && onQuantityChange ? (
            <div className="flex items-center gap-2 rounded-full bg-[#172337] p-1 text-white">
              <button onClick={() => onQuantityChange(product.id || product._id, -1)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label={`Decrease ${product.name}`}>
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-6 text-center text-sm font-black">{cartQuantity}</span>
              <button onClick={() => onQuantityChange(product.id || product._id, 1)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label={`Increase ${product.name}`}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={(event) => onAddToCart(product, event)}
              className="inline-flex h-12 min-w-[9.75rem] shrink-0 items-center justify-center gap-2 rounded-full bg-sovereign px-4 text-sm font-black text-obsidian shadow transition hover:brightness-105"
              style={{ backgroundColor: "var(--button-color)" }}
            >
              <ShoppingCart className="h-4 w-4" />
              {addToCartText}
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
