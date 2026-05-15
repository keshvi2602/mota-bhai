import { ImagePlus, PackagePlus, Upload } from "lucide-react";
import { useState } from "react";

const blankProduct = {
  category: "",
  description: "",
  discountMoney: "",
  image: "",
  name: "",
  price: "",
  tags: ""
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AddProductForm({ onCreateProduct, onViewStore }) {
  const [form, setForm] = useState(blankProduct);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setPreview(dataUrl);
    updateField("image", dataUrl);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const product = {
      category: form.category || tags[0] || "Premium Collection",
      description: form.description,
      discountMoney: Number(form.discountMoney || 0),
      image: form.image,
      name: form.name.trim(),
      price: Number(form.price || 0),
      tag: tags[0] || "New Arrival",
      tags
    };

    if (!product.name || !product.price || !product.image) {
      setMessage("Product name, price, and image are required.");
      setSaving(false);
      return;
    }

    await onCreateProduct(product);
    setForm(blankProduct);
    setPreview("");
    setMessage("Product created. Tags now route it into matching collections automatically.");
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-black/55">Add product</p>
          <h2 className="text-xl font-black">Tag routed listing</h2>
        </div>
        <PackagePlus className="h-6 w-6 text-emerald-700" />
      </div>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-bold">Product Image</span>
        <div className="relative grid min-h-56 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-black/20 bg-[#f7f7f4]">
          {preview || form.image ? (
            <img src={preview || form.image} alt="Product preview" className="h-full max-h-72 w-full object-cover" />
          ) : (
            <div className="text-center">
              <ImagePlus className="mx-auto h-8 w-8 text-black/45" />
              <p className="mt-2 text-sm font-bold">Upload image</p>
              <p className="text-xs text-black/50">PNG, JPG, or WEBP</p>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 cursor-pointer opacity-0" />
        </div>
      </label>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-bold">Image URL</span>
        <input
          value={form.image.startsWith("data:") ? "" : form.image}
          onChange={(event) => {
            setPreview("");
            updateField("image", event.target.value);
          }}
          placeholder="https://..."
          className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-bold">Product Name</span>
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">Price</span>
          <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateField("price", event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">Discount Money</span>
          <input type="number" min="0" step="0.01" value={form.discountMoney} onChange={(event) => updateField("discountMoney", event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        </label>
        <label>
          <span className="mb-2 block text-sm font-bold">Category</span>
          <input value={form.category} onChange={(event) => updateField("category", event.target.value)} className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-bold">Tags</span>
        <input
          value={form.tags}
          onChange={(event) => updateField("tags", event.target.value)}
          placeholder="Summer Collection, Best Seller"
          className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700"
        />
        <span className="mt-1 block text-xs text-black/50">
          If a collection match tag equals one of these tags, this product appears in that collection automatically.
        </span>
      </label>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-bold">Description</span>
        <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows="3" className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
      </label>

      <button disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f1f1f] px-5 py-3 font-black text-white disabled:opacity-60">
        <Upload className="h-4 w-4" />
        {saving ? "Submitting..." : "Submit Product"}
      </button>
      {message && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {message}
          <button type="button" onClick={onViewStore} className="mt-3 block rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white">
            View in Client Store
          </button>
        </div>
      )}
    </form>
  );
}
