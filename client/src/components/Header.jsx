import { Home, Info, LayoutGrid, ShoppingBag, Star } from "lucide-react";
import { motion } from "framer-motion";

export function Header({ cartCount, content, onCartOpen, onNavigate, themeConfig }) {
  const links = [
    { href: "/#home", label: content?.homeNavLabel || "Home", Icon: Home },
    { href: "/#categories", label: content?.collectionsNavLabel || "Collections", Icon: LayoutGrid },
    { href: "/reviews", label: content?.reviewsNavLabel || "Reviews", Icon: Star },
    { href: "/#about", label: content?.aboutNavLabel || "About Us", Icon: Info }
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-premium backdrop-blur-2xl md:grid-cols-[1fr_auto_1fr] sm:px-6">
        <div className="hidden text-xs uppercase tracking-[0.26em] text-champagne/70 lg:block">
          {content?.headerLeftText || content?.topMiniTagline || "Fine Gujarati Snacks"}
        </div>

        <button
          type="button"
          onClick={() => {
            onNavigate?.("/#home");
          }}
          className="justify-self-start text-left md:justify-self-center md:text-center"
        >
          {themeConfig?.logoUrl ? (
            <img src={themeConfig.logoUrl} alt="Mota Bhai" className="mx-auto max-h-10 max-w-40 object-contain" />
          ) : (
            <span className="block text-xl font-black tracking-[0.16em] text-white sm:text-2xl">
              {content?.headerCenterTitle || content?.storeName || "Mota Bhai"}
            </span>
          )}
          <span className="block text-[0.66rem] font-bold uppercase tracking-[0.35em] text-sovereign">
            {content?.headerCenterSubtitle || content?.topMiniTagline || "Fine Gujarati Snacks"}
          </span>
        </button>

        <div className="flex justify-self-end gap-2">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onCartOpen}
            className="relative rounded-full border border-sovereign/40 bg-sovereign px-4 py-3 text-sm font-black text-obsidian shadow-gold"
            style={{ backgroundColor: "var(--button-color)" }}
            aria-label="Open cart"
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-emeraldTrust px-1 text-xs text-white">
              {cartCount}
            </span>
          </motion.button>
        </div>
      </div>

      <nav className="mx-auto mt-3 flex max-w-7xl justify-start gap-2 overflow-x-auto pb-1">
        {links.map(({ href, label, Icon }) => (
          <a
            key={label}
            href={href}
            onClick={(event) => {
              if (!onNavigate) return;
              event.preventDefault();
              onNavigate(href);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-midnight/80 px-4 py-2 text-sm font-semibold text-slate-200 shadow-lg backdrop-blur-xl transition hover:border-sovereign/60 hover:text-champagne"
          >
            <Icon className="h-4 w-4 text-sovereign" />
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
