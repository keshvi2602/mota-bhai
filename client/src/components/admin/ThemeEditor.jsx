import { ImagePlus, Palette, Save } from "lucide-react";
import { useEffect, useState } from "react";

const defaultContent = {
  aboutHeading: "Gujarati nashta, made for Germany.",
  aboutLabel: "ABOUT MOTA BHAI",
  aboutNavLabel: "About Us",
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
  collectionsNavLabel: "Collections",
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
  reviewsNavLabel: "Reviews",
  storeName: "Mota Bhai",
  topMiniTagline: "Fine Gujarati Snacks",
  trustLine: "Fresh batches - Premium packing - WhatsApp ordering",
  whatsappNumber: "+917778881259"
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function TextInput({ form, label, field, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input
        value={form.content?.[field] || ""}
        onChange={(event) => onChange(field, event.target.value)}
        className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700"
      />
    </label>
  );
}

function TextArea({ form, label, field, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <textarea
        value={form.content?.[field] || ""}
        onChange={(event) => onChange(field, event.target.value)}
        rows="3"
        className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700"
      />
    </label>
  );
}

function Section({ children, title }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-[#fafaf8] p-4">
      <h3 className="mb-4 text-lg font-black">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function ThemeEditor({ themeConfig, onSave }) {
  const [form, setForm] = useState({ ...themeConfig, content: { ...defaultContent, ...(themeConfig.content || {}) } });
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm({ ...themeConfig, content: { ...defaultContent, ...(themeConfig.content || {}) } });
  }, [themeConfig]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateContent(field, value) {
    setForm((current) => ({ ...current, content: { ...current.content, [field]: value } }));
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    updateField("logoUrl", await readFileAsDataUrl(file));
  }

  async function handleFaviconUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    updateField("faviconUrl", await readFileAsDataUrl(file));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSave(form);
    setMessage("Storefront content updated successfully.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Storefront Content Editor</h2>
          <p className="mt-1 text-sm text-black/55">Edit customer-facing text from header to footer.</p>
        </div>
        <Palette className="h-6 w-6 text-emerald-700" />
      </div>

      <Section title="Theme Colors">
        {[
          ["primaryColor", "Primary Color"],
          ["buttonColor", "Button Color"],
          ["backgroundColor", "Background Color"],
          ["surfaceColor", "Surface Color"]
        ].map(([field, label]) => (
          <label key={field}>
            <span className="mb-2 block text-sm font-bold">{label}</span>
            <div className="flex overflow-hidden rounded-xl border border-black/10 bg-white">
              <input
                type="color"
                value={form[field] || "#000000"}
                onChange={(event) => updateField(field, event.target.value)}
                className="h-12 w-14 border-0 bg-transparent"
              />
              <input value={form[field] || ""} onChange={(event) => updateField(field, event.target.value)} className="w-full px-3 outline-none" />
            </div>
          </label>
        ))}
      </Section>

      <Section title="Header">
        <TextInput form={form} label="Left header text" field="headerLeftText" onChange={updateContent} />
        <TextInput form={form} label="Center brand title" field="headerCenterTitle" onChange={updateContent} />
        <TextInput form={form} label="Center subtitle" field="headerCenterSubtitle" onChange={updateContent} />
        <TextInput form={form} label="Home nav label" field="homeNavLabel" onChange={updateContent} />
        <TextInput form={form} label="Collections nav label" field="collectionsNavLabel" onChange={updateContent} />
        <TextInput form={form} label="Reviews nav label" field="reviewsNavLabel" onChange={updateContent} />
        <TextInput form={form} label="About nav label" field="aboutNavLabel" onChange={updateContent} />
        <div>
          <span className="mb-2 block text-sm font-bold">Logo image</span>
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-24 place-items-center overflow-hidden rounded-xl border border-black/10 bg-white">
              {form.logoUrl ? <img src={form.logoUrl} alt="Logo preview" className="h-full w-full object-contain" /> : <ImagePlus className="h-5 w-5 text-black/35" />}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1f1f1f] px-4 py-3 text-sm font-black text-white">
              <ImagePlus className="h-4 w-4" />
              Upload logo image
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>
        <div>
          <span className="mb-2 block text-sm font-bold">Website Favicon</span>
          <p className="mb-3 text-xs font-semibold text-black/50">Recommended size 512x512 PNG or ICO</p>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-black/10 bg-white">
              {form.faviconUrl ? <img src={form.faviconUrl} alt="Favicon preview" className="h-8 w-8 object-contain" /> : <ImagePlus className="h-5 w-5 text-black/35" />}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1f1f1f] px-4 py-3 text-sm font-black text-white">
              <ImagePlus className="h-4 w-4" />
              Upload / Change Favicon
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico" onChange={handleFaviconUpload} className="hidden" />
            </label>
          </div>
          <p className="mt-3 text-xs font-semibold text-black/50">Recommended: 512x512 PNG or ICO for best browser quality.</p>
        </div>
      </Section>

      <Section title="Hero">
        <TextInput form={form} label="Hero label" field="heroLabel" onChange={updateContent} />
        <TextInput form={form} label="Hero heading" field="heroHeading" onChange={updateContent} />
        <TextArea form={form} label="Hero subheading" field="heroSubheading" onChange={updateContent} />
        <TextInput form={form} label="CTA 1 text" field="ctaPrimaryText" onChange={updateContent} />
        <TextInput form={form} label="CTA 2 text" field="ctaSecondaryText" onChange={updateContent} />
        <TextInput form={form} label="Trust line" field="trustLine" onChange={updateContent} />
      </Section>

      <Section title="Trust Cards">
        {[1, 2, 3].map((number) => (
          <div key={number} className="rounded-xl border border-black/10 bg-white p-3 md:col-span-2">
            <label className="mb-3 flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.content?.[`feature${number}Visible`] !== false}
                onChange={(event) => updateContent(`feature${number}Visible`, event.target.checked)}
                className="h-4 w-4 accent-emerald-700"
              />
              Show card {number}
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <TextInput form={form} label={`Card ${number} title`} field={`feature${number}Title`} onChange={updateContent} />
              <TextInput form={form} label={`Card ${number} text`} field={`feature${number}Text`} onChange={updateContent} />
            </div>
          </div>
        ))}
      </Section>

      <Section title="Collections and Products">
        <TextInput form={form} label="Collections label" field="collectionLabel" onChange={updateContent} />
        <TextInput form={form} label="Collections heading" field="collectionHeading" onChange={updateContent} />
        <TextArea form={form} label="Collections description" field="collectionDescription" onChange={updateContent} />
        <TextInput form={form} label="Empty collections text" field="collectionEmptyText" onChange={updateContent} />
        <TextInput form={form} label="Back button text" field="backToCatalogsText" onChange={updateContent} />
        <TextInput form={form} label="Empty catalog message" field="emptyCatalogText" onChange={updateContent} />
        <TextInput form={form} label="Add to cart button text" field="addToCartText" onChange={updateContent} />
      </Section>

      <Section title="About and Footer">
        <TextInput form={form} label="About label" field="aboutLabel" onChange={updateContent} />
        <TextInput form={form} label="About heading" field="aboutHeading" onChange={updateContent} />
        <TextArea form={form} label="About paragraph" field="aboutParagraph" onChange={updateContent} />
        <TextArea form={form} label="About promise" field="aboutPromise" onChange={updateContent} />
        <TextInput form={form} label="Footer text" field="footerText" onChange={updateContent} />
      </Section>

      <Section title="WhatsApp and Checkout">
        <TextInput form={form} label="WhatsApp number" field="whatsappNumber" onChange={updateContent} />
        <TextInput form={form} label="Checkout button text" field="checkoutButtonText" onChange={updateContent} />
        <TextInput form={form} label="Cart empty message" field="cartEmptyMessage" onChange={updateContent} />
      </Section>

      <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f1f1f] px-5 py-3 font-black text-white">
        <Save className="h-4 w-4" />
        Save storefront content
      </button>
      {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}
    </form>
  );
}
