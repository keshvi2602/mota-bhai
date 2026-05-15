import { ImagePlus, Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "../../utils/whatsapp.js";

const blankProduct = {
  category: "",
  description: "",
  discountMoney: "",
  image: "",
  isActive: true,
  name: "",
  price: "",
  tags: ""
};

function productId(product) {
  return String(product.id || product._id);
}

function toFormProduct(product) {
  return {
    category: product.category || "",
    description: product.description || "",
    discountMoney: product.discountMoney || "",
    image: product.image || "",
    isActive: product.isActive !== false,
    name: product.name || "",
    price: product.price || "",
    tags: (product.tags || [product.tag]).filter(Boolean).join(", ")
  };
}

function normalizeProduct(form) {
  const tags = String(form.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    category: form.category || tags[0] || "Premium Collection",
    description: form.description,
    discountMoney: Number(form.discountMoney || 0),
    image: form.image,
    isActive: form.isActive,
    name: form.name.trim(),
    price: Number(form.price || 0),
    tag: tags[0] || "New Arrival",
    tags
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ProductForm({ form, onCancel, onChange, onSubmit, saving, title }) {
  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    onChange("image", await readFileAsDataUrl(file));
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-black/10 bg-[#fafaf8] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-black">{title}</h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg bg-black/10 p-2" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-[180px_1fr]">
        <div className="grid h-44 place-items-center overflow-hidden rounded-xl border border-black/10 bg-white">
          {form.image ? (
            <img src={form.image} alt="Product preview" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-8 w-8 text-black/35" />
          )}
        </div>
        <div className="flex flex-col justify-center gap-3">
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-[#1f1f1f] px-5 py-3 font-black text-white">
            <ImagePlus className="h-4 w-4" />
            Upload product image
            <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleImageUpload} className="hidden" />
          </label>
          <p className="text-xs leading-5 text-black/50">PNG, JPG, JPEG, or WEBP. The uploaded image is saved with the product.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input value={form.name} onChange={(event) => onChange("name", event.target.value)} placeholder="Product name" className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => onChange("price", event.target.value)} placeholder="Price" className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        <input type="number" min="0" step="0.01" value={form.discountMoney} onChange={(event) => onChange("discountMoney", event.target.value)} placeholder="Discount money" className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        <input value={form.category} onChange={(event) => onChange("category", event.target.value)} placeholder="Category" className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700" />
        <input value={form.tags} onChange={(event) => onChange("tags", event.target.value)} placeholder="Tags, comma separated" className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700 md:col-span-2" />
        <textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} placeholder="Description" rows="3" className="resize-none rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700 md:col-span-2" />
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={form.isActive} onChange={(event) => onChange("isActive", event.target.checked)} className="h-4 w-4 accent-emerald-700" />
        Active on storefront
      </label>

      <button disabled={saving} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f1f1f] px-5 py-3 font-black text-white disabled:opacity-60">
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save product"}
      </button>
    </form>
  );
}

export function ProductManager({ onCreateProduct, onDeleteProduct, onUpdateProduct, products }) {
  const [createForm, setCreateForm] = useState(blankProduct);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(blankProduct);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateCreate(field, value) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function updateEdit(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    const product = normalizeProduct(createForm);
    if (!product.name || !product.price || !product.image) {
      setMessage("Product name, price, and image are required.");
      return;
    }
    setSaving(true);
    try {
      await onCreateProduct(product);
      setCreateForm(blankProduct);
      setMessage("Product added successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();
    const product = normalizeProduct(editForm);
    if (!product.name || !product.price || !product.image) {
      setMessage("Product name, price, and image are required.");
      return;
    }
    setSaving(true);
    try {
      await onUpdateProduct(editingId, product);
      setEditingId("");
      setEditForm(blankProduct);
      setMessage("Product updated successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Are you sure you want to delete ${product.name}?`)) return;
    try {
      await onDeleteProduct(productId(product));
      setMessage("Product deleted successfully.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="space-y-5">
      <ProductForm
        form={createForm}
        onChange={updateCreate}
        onSubmit={handleCreate}
        saving={saving && !editingId}
        title="Add Product"
      />

      {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-black/55">Products</p>
            <h2 className="text-xl font-black">Catalog Items</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#f8f8f6] text-xs uppercase tracking-[0.12em] text-black/55">
              <tr>
                <th className="px-5 py-3">Image</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Discount</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Tags</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const id = productId(product);
                const isEditing = editingId === id;

                return (
                  <tr key={id} className="border-t border-black/10 align-top">
                    {isEditing ? (
                      <td colSpan="8" className="px-5 py-4">
                        <ProductForm
                          form={editForm}
                          onCancel={() => setEditingId("")}
                          onChange={updateEdit}
                          onSubmit={handleUpdate}
                          saving={saving}
                          title="Edit Product"
                        />
                      </td>
                    ) : (
                      <>
                        <td className="px-5 py-3">
                          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl border border-black/10 bg-[#fafaf8]">
                            {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-black/40" />}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-black">{product.name}</p>
                          <p className="line-clamp-2 max-w-xs text-xs text-black/50">{product.description}</p>
                        </td>
                        <td className="px-5 py-3 font-bold">{formatCurrency(product.price)}</td>
                        <td className="px-5 py-3 text-emerald-700">{formatCurrency(product.discountMoney || 0)}</td>
                        <td className="px-5 py-3">{product.category}</td>
                        <td className="px-5 py-3 text-black/65">{(product.tags || [product.tag]).filter(Boolean).join(", ")}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${product.isActive === false ? "bg-black/10 text-black/60" : "bg-emerald-50 text-emerald-800"}`}>
                            {product.isActive === false ? "Hidden" : "Active"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingId(id);
                                setEditForm(toFormProduct(product));
                              }}
                              className="rounded-lg bg-black/10 p-2"
                              aria-label="Edit product"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(product)} className="rounded-lg bg-red-50 p-2 text-red-700" aria-label="Delete product">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
