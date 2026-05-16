import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminPanel } from "./components/AdminPanel.jsx";
import { CartDrawer } from "./components/CartDrawer.jsx";
import { Header } from "./components/Header.jsx";
import { LoadingScreen } from "./components/LoadingScreen.jsx";
import { ProductCard } from "./components/ProductCard.jsx";
import { ReviewsPage } from "./components/ReviewsPage.jsx";
import { AdminLogin } from "./components/admin/AdminLogin.jsx";
import {
  API_URL,
  apiRequest,
  applyThemeConfig,
  clearAdminToken,
  getAdminToken,
  setAdminToken
} from "./utils/api.js";

const CART_KEY = "mota-bhai-cart";
const DEFAULT_CONTENT = {
  aboutHeading: "Gujarati nashta, made for Germany.",
  aboutLabel: "ABOUT MOTA BHAI",
  aboutParagraph: "Mota Bhai brings the taste of Gujarat closer to Gujarati families living in Germany. From crispy namkeen to festive gifting, every product is selected to feel fresh, familiar, and worth sharing with family and friends.",
  aboutPromise: "Simple ordering, honest pricing, premium packing, and the comfort of ghar jevo swaad - that is the Mota Bhai promise.",
  addToCartText: "Add to Cart",
  backToCatalogsText: "Back to catalogs",
  cartEmptyMessage: "Your cart is waiting for something special.",
  checkoutButtonText: "Place Order on WhatsApp",
  collectionDescription: "Choose your favourite catalog and explore fresh Gujarati snacks made for Germany.",
  collectionEmptyText: "No catalogs available yet.",
  collectionHeading: "Shop by Gujarati cravings.",
  collectionLabel: "COLLECTIONS",
  ctaPrimaryText: "Explore Catalogs",
  ctaSecondaryText: "Order on WhatsApp",
  emptyCatalogText: "No products available in this catalog yet.",
  feature1Text: "Handpicked snacks with authentic ghar jevo flavour.",
  feature1Title: "Fresh Gujarati Taste",
  feature1Visible: true,
  feature2Text: "Carefully packed for freshness, gifting, and safe delivery.",
  feature2Title: "Premium Packing",
  feature2Visible: true,
  feature3Text: "Select your items and send the order directly on WhatsApp.",
  feature3Title: "Easy WhatsApp Order",
  feature3Visible: true,
  footerText: "© Jalsa2026",
  headerCenterSubtitle: "Fine Gujarati Snacks",
  headerCenterTitle: "Mota Bhai",
  headerLeftText: "Fine Gujarati Snacks",
  heroHeading: "Germany ma Gujarat no swaad.",
  heroLabel: "Premium Gujarati Snacks in Germany",
  heroSubheading: "Fresh Gujarati nashta, premium packing, ane ghar jevo taste - specially Germany ma rehata Gujarati bhaiyo ane families mate.",
  homeNavLabel: "Home",
  collectionsNavLabel: "Collections",
  reviewsNavLabel: "Reviews",
  aboutNavLabel: "About Us",
  storeName: "Mota Bhai",
  topMiniTagline: "Fine Gujarati Snacks",
  trustLine: "Fresh batches - Premium packing - WhatsApp ordering",
  whatsappNumber: "+917778881259"
};

function getContent(themeConfig = {}) {
  const content = { ...DEFAULT_CONTENT, ...(themeConfig.content || {}) };
  return {
    ...content,
    headerCenterSubtitle: content.headerCenterSubtitle || content.topMiniTagline,
    headerCenterTitle: content.headerCenterTitle || content.storeName,
    headerLeftText: content.headerLeftText || content.topMiniTagline
  };
}

function getStoredCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getProductId(product) {
  return String(product.id || product._id);
}

function getCollectionSlug(collection) {
  return String(collection.handle || collection.slug || collection.id || collection._id || collection.title);
}

function productMatchesCollection(product, collection) {
  const productId = getProductId(product);
  return (collection.productIds || []).map(String).includes(productId);
}

function createCategorySections(products, collections) {
  return collections.map((collection) => ({
    ...collection,
    description: collection.description || "Freshly selected Gujarati snacks for Germany.",
    products: products.filter((product) => productMatchesCollection(product, collection))
  }));
}

function getBestSellingScore(product) {
  const bestSellingFlags = ["bestSelling", "isBestSelling", "featured", "isFeatured"];
  const salesFields = ["sales", "soldCount", "sold", "salesCount", "orderCount", "totalSold"];
  const searchText = [product.tag, ...(product.tags || [])].map(normalizeValue).join(" ");
  const hasBestSellingTag = ["best seller", "best-selling", "bestseller", "most selling", "popular", "featured", "customer favourite", "customer favorite"]
    .some((term) => searchText.includes(term));

  let score = hasBestSellingTag ? 100 : 0;
  if (bestSellingFlags.some((field) => product[field] === true)) score += 200;
  score += salesFields.reduce((total, field) => total + Math.max(Number(product[field] || 0), 0), 0);
  return score;
}

function selectBestSellingProducts(products, limit = 4) {
  const activeProducts = products.filter((product) => product.isActive !== false);
  const rankedProducts = activeProducts
    .map((product, index) => ({ index, product, score: getBestSellingScore(product) }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .map((item) => item.product);

  return (rankedProducts.length ? rankedProducts : activeProducts).slice(0, limit);
}

function getCurrentRoute() {
  if (window.location.pathname.startsWith("/admin")) return "admin";
  if (window.location.pathname.startsWith("/collections/")) return "collection";
  if (window.location.pathname.startsWith("/reviews")) return "reviews";
  return "store";
}

function getCollectionSlugFromPath() {
  return decodeURIComponent(window.location.pathname.replace(/^\/collections\/?/, "").split("/")[0] || "");
}

function Storefront({
  cartCount,
  cartOpen,
  cartTotal,
  cart,
  bestSellingProducts,
  catalogError,
  categorySections,
  flyingItem,
  onAddToCart,
  onCartOpen,
  onCartClose,
  onQuantityChange,
  onNavigate,
  themeConfig
}) {
  const content = getContent(themeConfig);

  return (
    <>
      <Header cartCount={cartCount} content={content} onCartOpen={onCartOpen} onNavigate={onNavigate} themeConfig={themeConfig} />

      <main>
        <section id="home" className="relative flex min-h-[720px] items-center px-5 pb-20 pt-44 sm:px-10 lg:px-16">
          <div className="absolute inset-0 -z-10">
            <img
              src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1900&q=90"
              alt=""
              className="h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/90 to-obsidian/50" />
          </div>

          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-3xl"
            >
              <p className="text-sm font-black uppercase tracking-[0.28em] text-sovereign">
                {content.heroLabel}
              </p>
              <h1 className="mt-5 text-5xl font-black leading-[0.92] text-white sm:text-7xl lg:text-8xl">
                {content.heroHeading}
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
                {content.heroSubheading}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="#categories" style={{ backgroundColor: "var(--button-color)" }} className="rounded-full bg-sovereign px-7 py-4 font-black text-obsidian shadow-gold">
                  {content.ctaPrimaryText}
                </a>
                <a href={`https://wa.me/${String(content.whatsappNumber).replace(/\D/g, "")}`} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-7 py-4 font-black text-white backdrop-blur-xl">
                  <MessageCircle className="h-5 w-5 text-sovereign" />
                  {content.ctaSecondaryText}
                </a>
              </div>
              <p className="mt-5 text-sm font-bold text-champagne/80">
                {content.trustLine}
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: ShieldCheck, label: content.feature1Title, text: content.feature1Text, visible: content.feature1Visible },
                { icon: PackageCheck, label: content.feature2Title, text: content.feature2Text, visible: content.feature2Visible },
                { icon: Truck, label: content.feature3Title, text: content.feature3Text, visible: content.feature3Visible }
              ].filter((card) => card.visible !== false).map(({ icon: Icon, label, text }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
                  <Icon className="h-6 w-6 text-sovereign" />
                  <h3 className="mt-4 font-black text-white">{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {bestSellingProducts.length > 0 && (
          <section className="mx-auto max-w-7xl px-5 pb-8 pt-20 sm:px-10 lg:px-16">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-sovereign">Best Sellers</p>
                <h2 className="mt-3 max-w-3xl text-4xl font-black text-white sm:text-5xl">
                  Most Selling Products
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-slate-400">
                Customer favourites, picked for quality and value.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {bestSellingProducts.map((product) => {
                const cartItem = cart.find((item) => getProductId(item) === getProductId(product));
                return (
                  <ProductCard
                    key={product.id || product._id}
                    addToCartText={content.addToCartText}
                    cartQuantity={cartItem?.quantity || 0}
                    onAddToCart={onAddToCart}
                    onQuantityChange={onQuantityChange}
                    product={product}
                  />
                );
              })}
            </div>
          </section>
        )}

        <section id="categories" className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-10 lg:px-16">
          <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-emeraldTrust">{content.collectionLabel}</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black text-white sm:text-6xl">
                {content.collectionHeading}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-400">
              {content.collectionDescription}
            </p>
          </div>

          {categorySections.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {categorySections.map((section) => {
              const slug = getCollectionSlug(section);
              const initials = String(section.title || "MB")
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <a
                  key={slug}
                  href={`/collections/${slug}`}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(`/collections/${slug}`);
                  }}
                  className="group relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.06] text-left shadow-premium transition duration-500 [transform-style:preserve-3d] hover:[transform:perspective(900px)_rotateX(2deg)_rotateY(-2deg)_translateY(-8px)] hover:border-sovereign/60 hover:shadow-gold"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-transparent opacity-95" />
                  <div className="h-48 overflow-hidden bg-midnight sm:h-56 lg:h-48 xl:h-52">
                    {section.image ? (
                      <img loading="lazy" src={section.image} alt={section.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#19110a] via-midnight to-[#0b241c] text-5xl font-black text-sovereign">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="relative -mt-10 flex flex-1 flex-col p-4">
                    <span className="inline-flex rounded-full border border-sovereign/35 bg-obsidian/80 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-champagne backdrop-blur">
                      {section.products.length} Products
                    </span>
                    <div className="mt-3 flex flex-1 flex-col rounded-2xl border border-white/10 bg-obsidian/78 p-4 backdrop-blur-xl">
                      <h3 className="line-clamp-2 min-h-14 text-xl font-black leading-7 text-white">{section.title}</h3>
                      <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-300">{section.description}</p>
                      <span className="mt-auto inline-flex w-fit rounded-full bg-sovereign px-4 py-2.5 text-sm font-black text-obsidian transition group-hover:shadow-gold">
                        Explore Collection
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-10 text-center text-slate-300">
              {catalogError || content.collectionEmptyText}
            </div>
          )}
        </section>

        <section id="about" className="border-y border-white/10 bg-white/[0.045] px-5 py-20 sm:px-10 lg:px-16">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-sovereign">{content.aboutLabel}</p>
              <h2 className="mt-3 text-4xl font-black text-white sm:text-6xl">
                {content.aboutHeading}
              </h2>
            </div>
            <div className="space-y-5 text-lg leading-9 text-slate-300">
              <p>
                {content.aboutParagraph}
              </p>
              <p className="font-bold text-champagne">
                {content.aboutPromise}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-5 py-10 text-center text-sm text-slate-500">
        {content.footerText}
      </footer>

      <AnimatePresence>
        {flyingItem && (
          <motion.img
            key={flyingItem.id}
            src={flyingItem.image}
            alt=""
            className="pointer-events-none fixed z-[90] h-14 w-14 rounded-2xl object-cover shadow-gold"
            initial={{
              x: flyingItem.startX - 28,
              y: flyingItem.startY - 28,
              opacity: 1,
              scale: 1
            }}
            animate={{
              x: flyingItem.endX,
              y: flyingItem.endY,
              opacity: 0.15,
              scale: 0.35
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      <CartDrawer
        cart={cart}
        cartCount={cartCount}
        cartTotal={cartTotal}
        isOpen={cartOpen}
        onClose={onCartClose}
        onQuantityChange={onQuantityChange}
        content={content}
      />
    </>
  );
}

function CollectionPage({
  cart,
  cartCount,
  cartOpen,
  cartTotal,
  categorySections,
  collectionSlug,
  content,
  flyingItem,
  onAddToCart,
  onCartClose,
  onCartOpen,
  onNavigate,
  onQuantityChange,
  themeConfig
}) {
  const collection = categorySections.find((section) => getCollectionSlug(section) === collectionSlug);

  return (
    <>
      <Header cartCount={cartCount} content={content} onCartOpen={onCartOpen} onNavigate={onNavigate} themeConfig={themeConfig} />
      <main className="min-h-screen px-5 pb-20 pt-44 sm:px-10 lg:px-16">
        <section className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => onNavigate("/#categories")}
            className="mb-8 rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:border-sovereign/50"
          >
            {content.backToCatalogsText || "Back to collections"}
          </button>

          {collection ? (
            <>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
                <div className="absolute inset-0 -z-10">
                  {collection.image && <img src={collection.image} alt="" className="h-full w-full object-cover opacity-25" />}
                  <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/90 to-obsidian/70" />
                </div>
                <div className="grid gap-6 p-6 md:grid-cols-[220px_1fr] md:p-8">
                  <div className="h-52 overflow-hidden rounded-xl bg-midnight">
                    {collection.image ? (
                      <img src={collection.image} alt={collection.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-2xl font-black text-sovereign">MB</div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-sovereign">{content.collectionLabel}</p>
                    <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">{collection.title}</h1>
                    <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                      {collection.description || "Explore fresh Gujarati snacks from this catalog."}
                    </p>
                    <span className="mt-6 w-fit rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-champagne">
                      {collection.products.length} products
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                {collection.products.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                    {collection.products.map((product) => {
                      const cartItem = cart.find((item) => getProductId(item) === getProductId(product));
                      return (
                        <ProductCard
                          key={product.id || product._id}
                          addToCartText={content.addToCartText}
                          cartQuantity={cartItem?.quantity || 0}
                          onAddToCart={onAddToCart}
                          onQuantityChange={onQuantityChange}
                          product={product}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-10 text-center text-slate-300">
                    {content.emptyCatalogText}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-10 text-center text-slate-300">
              {content.collectionEmptyText}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {flyingItem && (
          <motion.img
            key={flyingItem.id}
            src={flyingItem.image}
            alt=""
            className="pointer-events-none fixed z-[90] h-14 w-14 rounded-2xl object-cover shadow-gold"
            initial={{ x: flyingItem.startX - 28, y: flyingItem.startY - 28, opacity: 1, scale: 1 }}
            animate={{ x: flyingItem.endX, y: flyingItem.endY, opacity: 0.15, scale: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      <CartDrawer
        cart={cart}
        cartCount={cartCount}
        cartTotal={cartTotal}
        content={content}
        isOpen={cartOpen}
        onClose={onCartClose}
        onQuantityChange={onQuantityChange}
      />
    </>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => getCurrentRoute());
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [orders, setOrders] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [themeConfig, setThemeConfig] = useState({
    primaryColor: "#d4af37",
    buttonColor: "#d4af37",
    backgroundColor: "#050914",
    surfaceColor: "#0b1224",
    logoUrl: ""
  });
  const [adminProfile, setAdminProfile] = useState(null);
  const [adminToken, setAdminTokenState] = useState(() => getAdminToken());
  const [cart, setCart] = useState(() => getStoredCart());
  const [cartOpen, setCartOpen] = useState(false);
  const [flyingItem, setFlyingItem] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Preparing fresh Gujarati snacks");

  useEffect(() => {
    function handlePopState() {
      setRoute(getCurrentRoute());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Cart persistence is best-effort when image payloads are large.
    }
  }, [cart]);

  function navigate(path) {
    window.history.pushState({}, "", path);
    setRoute(getCurrentRoute());
    window.setTimeout(() => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  }

  async function refreshProducts() {
    try {
      const response = await fetch(`${API_URL}/api/products`);
      const items = await response.json();
      if (!response.ok) throw new Error(items?.message || "Failed to load products.");
      setProducts(items);
      setCatalogError("");
    } catch {
      setCatalogError("Could not load products from the database. Please check the backend and MongoDB.");
    }
  }

  async function refreshCollections() {
    try {
      const response = await fetch(`${API_URL}/api/collections`);
      const items = await response.json();
      if (!response.ok) throw new Error(items?.message || "Failed to load collections.");
      setCollections(items);
      setCatalogError("");
    } catch {
      setCatalogError("Could not load collections from the database. Please check the backend and MongoDB.");
    }
  }

  async function refreshAdminData() {
    if (!getAdminToken()) return;
    try {
      const [profile, adminOrders, adminProducts] = await Promise.all([
        apiRequest("/api/admin/profile"),
        apiRequest("/api/admin/orders"),
        apiRequest("/api/admin/products")
      ]);
      setAdminProfile(profile);
      setOrders(adminOrders);
      setProducts(adminProducts);
    } catch {
      clearAdminToken();
      setAdminTokenState("");
      if (window.location.pathname === "/admin") {
        window.history.replaceState({}, "", "/admin/login");
      }
    }
  }

  useEffect(() => {
    let isMounted = true;
    const startedAt = Date.now();
    const minimumLoaderTime = 950;

    async function loadInitialStoreData() {
      setInitialLoading(true);
      setLoadingMessage("Preparing fresh Gujarati snacks");

      await Promise.allSettled([
        refreshProducts(),
        refreshCollections(),
        fetch(`${API_URL}/api/theme`)
          .then((response) => response.json())
          .then((config) => {
            setThemeConfig(config);
            applyThemeConfig(config);
          })
          .catch(() => applyThemeConfig(themeConfig))
      ]);

      const remainingTime = Math.max(0, minimumLoaderTime - (Date.now() - startedAt));
      window.setTimeout(() => {
        if (isMounted) {
          setLoadingMessage("Jalso is ready");
          setInitialLoading(false);
        }
      }, remainingTime);
    }

    loadInitialStoreData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (adminToken) {
      refreshAdminData();
    }
  }, [adminToken]);

  useEffect(() => {
    if (route === "admin" && !adminToken && window.location.pathname !== "/admin/login") {
      window.history.replaceState({}, "", "/admin/login");
    }
  }, [adminToken, route]);

  const cartCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart]
  );

  const cartTotal = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );

  const categorySections = useMemo(
    () => createCategorySections(products.filter((product) => product.isActive !== false), collections),
    [products, collections]
  );
  const bestSellingProducts = useMemo(
    () => selectBestSellingProducts(products, 4),
    [products]
  );
  const content = useMemo(() => getContent(themeConfig), [themeConfig]);

  function calculateClientProduct(product) {
    const discountMoney = Number(product.discountMoney || 0);
    return {
      ...product,
      originalPrice: Number(product.price || 0),
      price: Math.max(Number(product.price || 0) - discountMoney, 0)
    };
  }

  function addToCart(product, event) {
    const cartProduct = calculateClientProduct(product);
    const rect = event.currentTarget.getBoundingClientRect();
    setFlyingItem({
      id: `${cartProduct.id || cartProduct._id}-${Date.now()}`,
      image: cartProduct.image,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      endX: window.innerWidth - 74,
      endY: 42
    });

    setCart((items) => {
      const existing = items.find((item) => getProductId(item) === getProductId(cartProduct));
      if (existing) {
        return items.map((item) =>
          getProductId(item) === getProductId(cartProduct) ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...items, { ...cartProduct, quantity: 1 }];
    });

    window.setTimeout(() => setFlyingItem(null), 760);
  }

  async function createProduct(product) {
    const savedProduct = await apiRequest("/api/admin/products", {
      body: JSON.stringify(product),
      method: "POST"
    });
    setProducts((items) => [savedProduct, ...items]);
    await refreshProducts();
    return savedProduct;
  }

  async function updateProduct(productId, product) {
    const savedProduct = await apiRequest(`/api/admin/products/${productId}`, {
      body: JSON.stringify(product),
      method: "PUT"
    });
    setProducts((items) => items.map((item) => (getProductId(item) === String(productId) ? savedProduct : item)));
    await refreshProducts();
    return savedProduct;
  }

  async function deleteProduct(productId) {
    await apiRequest(`/api/admin/products/${productId}`, { method: "DELETE" });
    setProducts((items) => items.filter((product) => getProductId(product) !== String(productId)));
    setCollections((items) =>
      items.map((collection) => ({
        ...collection,
        productIds: (collection.productIds || []).filter((id) => String(id) !== String(productId))
      }))
    );
    await refreshProducts();
    await refreshCollections();
  }

  async function loginAdmin(credentials) {
    const result = await apiRequest("/api/auth/login", {
      body: JSON.stringify(credentials),
      method: "POST"
    });
    setAdminToken(result.token);
    setAdminTokenState(result.token);
    setAdminProfile(result.admin);
    window.history.replaceState({}, "", "/admin");
    setRoute("admin");
  }

  function logoutAdmin() {
    clearAdminToken();
    setAdminTokenState("");
    setAdminProfile(null);
    window.history.replaceState({}, "", "/admin/login");
    setRoute("admin");
  }

  async function createCollection(collection) {
    const savedCollection = await apiRequest("/api/admin/collections", {
      body: JSON.stringify(collection),
      method: "POST"
    });
    setCollections((items) => [savedCollection, ...items]);
    await refreshCollections();
  }

  async function deleteCollection(collectionId) {
    await apiRequest(`/api/admin/collections/${collectionId}`, { method: "DELETE" });
    setCollections((items) => items.filter((collection) => String(collection.id || collection._id) !== String(collectionId)));
    await refreshCollections();
  }

  async function updateCollection(collectionId, collection) {
    const savedCollection = await apiRequest(`/api/admin/collections/${collectionId}`, {
      body: JSON.stringify(collection),
      method: "PUT"
    });
    setCollections((items) =>
      items.map((item) => (String(item.id || item._id) === String(collectionId) ? savedCollection : item))
    );
    await refreshCollections();
  }

  async function updateOrderStatus(orderId, status) {
    const savedOrder = await apiRequest(`/api/admin/orders/${orderId}/status`, {
      body: JSON.stringify({ status }),
      method: "PATCH"
    });
    setOrders((items) => items.map((order) => (String(order.orderId || order.id || order._id) === String(orderId) ? savedOrder : order)));
  }

  async function saveTheme(nextThemeConfig) {
    const savedThemeConfig = await apiRequest("/api/admin/theme", {
      body: JSON.stringify({ themeConfig: nextThemeConfig }),
      method: "PUT"
    });
    setThemeConfig(savedThemeConfig);
    applyThemeConfig(savedThemeConfig);
  }

  async function saveProfile(profile) {
    const savedProfile = await apiRequest("/api/admin/profile", {
      body: JSON.stringify(profile),
      method: "PUT"
    });
    setAdminProfile(savedProfile);
    return savedProfile;
  }

  async function recoverStoreData(localStorageData) {
    const result = await apiRequest("/api/admin/recovery/import", {
      body: JSON.stringify({ localStorage: localStorageData }),
      method: "POST"
    });
    await Promise.all([refreshProducts(), refreshCollections(), refreshAdminData()]);
    const nextTheme = await fetch(`${API_URL}/api/theme`).then((response) => response.json());
    setThemeConfig(nextTheme);
    applyThemeConfig(nextTheme);
    return result;
  }

  function changeQuantity(productId, direction) {
    setCart((items) =>
      items
        .map((item) =>
          getProductId(item) === String(productId)
            ? { ...item, quantity: Math.max(0, item.quantity + direction) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  let page;

  if (route === "admin") {
    page = adminToken ? (
      <AdminPanel
        adminProfile={adminProfile}
        collections={collections}
        orders={orders}
        products={products}
        themeConfig={themeConfig}
        onCreateCollection={createCollection}
        onCreateProduct={createProduct}
        onDeleteCollection={deleteCollection}
        onDeleteProduct={deleteProduct}
        onCredentialChanged={logoutAdmin}
        onLogout={logoutAdmin}
        onSaveProfile={saveProfile}
        onSaveTheme={saveTheme}
        onRecoverStoreData={recoverStoreData}
        onUpdateOrderStatus={updateOrderStatus}
        onUpdateCollection={updateCollection}
        onUpdateProduct={updateProduct}
      />
    ) : (
      <AdminLogin onLogin={loginAdmin} />
    );
  } else if (route === "collection") {
    page = (
      <div className="min-h-screen overflow-hidden">
        <CollectionPage
          cart={cart}
          cartCount={cartCount}
          cartOpen={cartOpen}
          cartTotal={cartTotal}
          categorySections={categorySections}
          collectionSlug={getCollectionSlugFromPath()}
          content={content}
          flyingItem={flyingItem}
          onAddToCart={addToCart}
          onCartClose={() => setCartOpen(false)}
          onCartOpen={() => setCartOpen(true)}
          onNavigate={navigate}
          onQuantityChange={changeQuantity}
          themeConfig={themeConfig}
        />
      </div>
    );
  } else if (route === "reviews") {
    page = (
      <ReviewsPage
        cart={cart}
        cartCount={cartCount}
        cartOpen={cartOpen}
        cartTotal={cartTotal}
        content={content}
        onCartClose={() => setCartOpen(false)}
        onCartOpen={() => setCartOpen(true)}
        onNavigate={navigate}
        onQuantityChange={changeQuantity}
        themeConfig={themeConfig}
      />
    );
  } else {
    page = (
      <div className="min-h-screen overflow-hidden">
        <Storefront
          bestSellingProducts={bestSellingProducts}
          cart={cart}
          cartCount={cartCount}
          cartOpen={cartOpen}
          cartTotal={cartTotal}
          catalogError={catalogError}
          categorySections={categorySections}
          flyingItem={flyingItem}
          themeConfig={themeConfig}
          onAddToCart={addToCart}
          onCartClose={() => setCartOpen(false)}
          onCartOpen={() => setCartOpen(true)}
          onNavigate={navigate}
          onQuantityChange={changeQuantity}
        />
      </div>
    );
  }

  return (
    <>
      {page}
      <AnimatePresence>
        {initialLoading && <LoadingScreen message={loadingMessage} />}
      </AnimatePresence>
    </>
  );
}
