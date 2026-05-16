import { Home, Info, LayoutGrid, ShoppingBag, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function Header({ cartCount, content, onCartOpen, onNavigate, themeConfig }) {
  const logoUrl = String(themeConfig?.logoUrl || "").trim();
  const [logoFailed, setLogoFailed] = useState(false);
  const storeName = content?.headerCenterTitle || content?.storeName || "Mota Bhai";
  const hasLogo = Boolean(logoUrl && !logoFailed);
  const links = [
    { href: "/#home", label: content?.homeNavLabel || "Home", Icon: Home },
    { href: "/#categories", label: content?.collectionsNavLabel || "Collections", Icon: LayoutGrid },
    { href: "/reviews", label: content?.reviewsNavLabel || "Reviews", Icon: Star },
    { href: "/#about", label: content?.aboutNavLabel || "About Us", Icon: Info }
  ];

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 shadow-premium backdrop-blur-2xl sm:px-6">
        <div className="hidden min-w-0 text-xs uppercase tracking-[0.26em] text-champagne/70 lg:block">
          {content?.headerLeftText || content?.topMiniTagline || "Fine Gujarati Snacks"}
        </div>

        <button
          type="button"
          onClick={() => {
            onNavigate?.("/#home");
          }}
          className="col-start-2 flex min-w-0 justify-self-center text-center"
          aria-label={`Go to ${storeName} home`}
        >
          {hasLogo ? (
            <span className="flex h-12 w-32 items-center justify-center py-1 sm:h-14 sm:w-40 md:w-48">
              <img
                src={logoUrl}
                alt={storeName}
                className="block max-h-full max-w-full object-contain"
                onError={() => setLogoFailed(true)}
              />
            </span>
          ) : (
            <span className="block max-w-44 truncate text-lg font-black tracking-[0.14em] text-white sm:max-w-56 sm:text-2xl">
              {storeName}
            </span>
          )}
        </button>

        <div className="col-start-3 flex justify-self-end gap-2">
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
