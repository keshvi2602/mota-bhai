import {
  BadgeEuro,
  BarChart3,
  Boxes,
  DatabaseBackup,
  Download,
  LogOut,
  Settings,
  ShoppingBag,
  Tag,
  Upload,
  UserRound
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CollectionManager } from "./admin/CollectionManager.jsx";
import { ProductManager } from "./admin/ProductManager.jsx";
import { ProfileSettings } from "./admin/ProfileSettings.jsx";
import { ThemeEditor } from "./admin/ThemeEditor.jsx";
import { formatCurrency } from "../utils/whatsapp.js";

function getProductId(product) {
  return String(product.id || product._id);
}

const RECOVERY_KEYWORDS = [
  "product",
  "collection",
  "catalog",
  "theme",
  "storefront",
  "content",
  "order",
  "admin",
  "profile"
];

function getRecoveryLocalStorageSnapshot() {
  return Object.fromEntries(
    Object.keys(localStorage)
      .filter((key) => RECOVERY_KEYWORDS.some((keyword) => key.toLowerCase().includes(keyword)))
      .map((key) => [key, localStorage.getItem(key)])
  );
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function RecoverySection({ onRecoverStoreData }) {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState(null);

  async function runImport(source, data) {
    setBusy(source);
    setMessage("");
    try {
      const result = await onRecoverStoreData(data);
      setLastResult(result);
      setMessage(`Recovered ${result.recovered.products} products and ${result.recovered.collections} collections.`);
    } catch (error) {
      setMessage(error.message || "Recovery failed.");
    } finally {
      setBusy("");
    }
  }

  async function importFromBrowser() {
    const snapshot = getRecoveryLocalStorageSnapshot();
    await runImport("browser", snapshot);
  }

  async function handleBackupFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("file");
    setMessage("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await runImport("file", data);
    } catch (error) {
      setBusy("");
      setMessage(error.message || "Could not parse backup JSON file.");
    }
  }

  function exportBrowserBackup() {
    const snapshot = getRecoveryLocalStorageSnapshot();
    downloadJson("mota-bhai-localstorage-backup.json", snapshot);
    setLastResult({ sourceKeys: Object.keys(snapshot), recovered: { products: 0, collections: 0 } });
    setMessage(`Exported ${Object.keys(snapshot).length} browser keys.`);
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold text-black/55">Recovery</p>
          <h2 className="text-xl font-black">Recover Saved Store Data</h2>
        </div>
        <DatabaseBackup className="h-6 w-6 text-emerald-700" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={importFromBrowser}
          disabled={!!busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f1f1f] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <DatabaseBackup className="h-4 w-4" />
          {busy === "browser" ? "Importing..." : "Import from Browser LocalStorage"}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!!busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-[#f7f7f4] px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {busy === "file" ? "Importing..." : "Import from Backup JSON File"}
        </button>
        <button
          type="button"
          onClick={exportBrowserBackup}
          disabled={!!busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Export Browser Backup
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleBackupFile} className="hidden" />

      {message && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}
      {lastResult?.sourceKeys?.length ? (
        <div className="mt-4 rounded-xl bg-[#f8f8f6] p-4 text-sm text-black/65">
          <p className="font-black text-black">LocalStorage keys found</p>
          <p className="mt-2 break-words">{lastResult.sourceKeys.join(", ")}</p>
          {lastResult.totals && (
            <p className="mt-2 font-bold">
              Server totals: {lastResult.totals.products} products, {lastResult.totals.collections} collections, {lastResult.totals.orders} orders.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AdminPanel({
  adminProfile,
  collections,
  onCreateCollection,
  onCreateProduct,
  onDeleteCollection,
  onDeleteProduct,
  onCredentialChanged,
  onLogout,
  onSaveProfile,
  onSaveTheme,
  onRecoverStoreData,
  onUpdateCollection,
  onUpdateOrderStatus,
  onUpdateProduct,
  orders,
  products,
  themeConfig
}) {
  const [activeSection, setActiveSection] = useState("dashboard");

  const stats = useMemo(() => {
    const totalValue = products.reduce((sum, product) => sum + Number(product.price || 0), 0);
    const discounted = products.filter((product) => Number(product.discountMoney || 0) > 0).length;
    return [
      { label: "Products", value: products.length, Icon: Boxes },
      { label: "Collections", value: collections.length, Icon: Tag },
      { label: "Orders", value: orders.length, Icon: ShoppingBag },
      { label: "Catalog value", value: formatCurrency(totalValue), Icon: BadgeEuro },
      { label: "Discounted", value: discounted, Icon: Tag }
    ];
  }, [collections.length, orders.length, products]);

  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: BarChart3 },
    { id: "orders", label: "Orders", Icon: ShoppingBag },
    { id: "products", label: "Products", Icon: Boxes },
    { id: "collections", label: "Collections", Icon: Tag },
    { id: "theme", label: "Theme", Icon: Settings },
    { id: "profile", label: "Profile / Settings", Icon: UserRound }
  ];

  const adminName = adminProfile?.name || "Mota Bhai Admin";
  const profileImage = adminProfile?.profileImage || "";

  return (
    <main id="admin" className="min-h-screen bg-[#f4f4f1] text-[#1f1f1f]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[268px_1fr]">
        <aside className="border-r border-black/10 bg-white px-4 py-5 lg:sticky lg:top-0 lg:h-screen">
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[#f7f7f4] p-3">
            <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-[#1f1f1f] text-sm font-black text-white">
              {profileImage ? <img src={profileImage} alt={adminName} className="h-full w-full object-cover" /> : "MB"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{adminName}</p>
              <p className="truncate text-xs text-black/55">{adminProfile?.email || "Admin"}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                  activeSection === id ? "bg-[#1f1f1f] text-white shadow-sm" : "text-black/70 hover:bg-[#f7f7f4]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          <button
            onClick={onLogout}
            className="mt-8 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </aside>

        <section className="min-w-0 px-4 py-6 sm:px-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-3xl font-black tracking-tight">{navItems.find((item) => item.id === activeSection)?.label}</h1>
            </div>
            <a href="/" className="inline-flex w-fit rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black shadow-sm hover:bg-[#fafaf8]">
              View storefront
            </a>
          </div>

          {activeSection === "dashboard" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {stats.map(({ label, value, Icon }) => (
                  <div key={label} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-black/55">{label}</p>
                      <Icon className="h-5 w-5 text-emerald-700" />
                    </div>
                    <strong className="mt-4 block text-2xl font-black">{value}</strong>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">Store health</h2>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Products, collections, orders, settings, and reviews are served from the backend database. Manual product assignment inside collections controls what customers see in each category.
                </p>
              </div>
            </div>
          )}

          {activeSection === "orders" && (
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 px-5 py-4">
                <p className="text-sm font-bold text-black/55">Orders</p>
                <h2 className="text-xl font-black">Customer Orders</h2>
              </div>
              {orders.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="bg-[#f8f8f6] text-xs uppercase tracking-[0.12em] text-black/55">
                      <tr>
                        <th className="px-5 py-3">Order</th>
                        <th className="px-5 py-3">Date & Time</th>
                        <th className="px-5 py-3">Customer</th>
                        <th className="px-5 py-3">Mobile</th>
                        <th className="px-5 py-3">Address</th>
                        <th className="px-5 py-3">Items</th>
                        <th className="px-5 py-3">Total</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.orderId || order._id} className="border-t border-black/10 align-top">
                          <td className="px-5 py-3 font-black">{order.orderId}</td>
                          <td className="px-5 py-3">
                            {new Date(order.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </td>
                          <td className="px-5 py-3">{order.customer?.name}</td>
                          <td className="px-5 py-3">{order.customer?.phone}</td>
                          <td className="max-w-xs px-5 py-3">{order.customer?.address}</td>
                          <td className="px-5 py-3">
                            {(order.items || []).map((item) => (
                              <p key={`${order.orderId}-${item.name}`}>{item.name} x {item.quantity}</p>
                            ))}
                          </td>
                          <td className="px-5 py-3 font-black">{formatCurrency(order.total)}</td>
                          <td className="px-5 py-3">
                            <select
                              className="rounded-full border border-black/10 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 outline-none"
                              onChange={(event) => onUpdateOrderStatus?.(order.orderId || order._id, event.target.value)}
                              value={order.status || "Pending"}
                            >
                              {["Pending", "Confirmed", "Packed", "Delivered", "Cancelled"].map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-5 text-sm text-black/55">No orders yet. WhatsApp checkout messages are prepared with full customer details.</p>
              )}
            </div>
          )}

          {activeSection === "products" && (
            <ProductManager
              products={products}
              onCreateProduct={onCreateProduct}
              onDeleteProduct={onDeleteProduct}
              onUpdateProduct={onUpdateProduct}
            />
          )}

          {activeSection === "collections" && (
            <CollectionManager
              collections={collections}
              products={products}
              onCreateCollection={onCreateCollection}
              onDeleteCollection={onDeleteCollection}
              onUpdateCollection={onUpdateCollection}
            />
          )}

          {activeSection === "theme" && <ThemeEditor themeConfig={themeConfig} onSave={onSaveTheme} />}

          {activeSection === "profile" && (
            <ProfileSettings adminProfile={adminProfile} onCredentialChanged={onCredentialChanged} onSaveProfile={onSaveProfile} />
          )}
        </section>
      </div>
    </main>
  );
}
