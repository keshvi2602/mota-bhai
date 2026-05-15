import { ImagePlus, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

const blankForm = {
  description: "",
  image: "",
  matchTag: "",
  productIds: [],
  title: ""
};

function productId(product) {
  return String(product.id || product._id);
}

function collectionProductCount(collection, products) {
  const ids = new Set((collection.productIds || []).map(String));
  return products.filter((product) => ids.has(productId(product))).length;
}

function ProductPicker({ emptyText = "No products available.", products, selectedIds, onChange }) {
  const selected = new Set(selectedIds.map(String));

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange([...next]);
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-xl border border-black/10 bg-[#fafaf8] p-2">
      {products.length ? products.map((product) => {
        const id = productId(product);

        return (
          <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white">
            <input
              type="checkbox"
              checked={selected.has(id)}
              onChange={() => toggle(id)}
              className="h-4 w-4 accent-emerald-700"
            />
            <img src={product.image} alt={product.name} className="h-9 w-9 rounded-lg object-cover" />
            <span className="text-sm font-bold">{product.name}</span>
          </label>
        );
      }) : (
        <p className="rounded-lg bg-white px-3 py-4 text-sm font-bold text-black/50">{emptyText}</p>
      )}
    </div>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function CollectionImageUpload({ image, onChange }) {
  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    onChange(await readFileAsDataUrl(file));
  }

  return (
    <div className="grid gap-3 md:grid-cols-[160px_1fr]">
      <div className="grid h-36 place-items-center overflow-hidden rounded-xl border border-black/10 bg-white">
        {image ? <img src={image} alt="Collection preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-black/35" />}
      </div>
      <div className="flex flex-col justify-center gap-3">
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-[#1f1f1f] px-5 py-3 font-black text-white">
          <ImagePlus className="h-4 w-4" />
          Upload collection image
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleImageUpload} className="hidden" />
        </label>
        <p className="text-xs leading-5 text-black/50">PNG, JPG, JPEG, or WEBP. This image appears on the storefront catalog card.</p>
      </div>
    </div>
  );
}

export function CollectionManager({ collections, products, onCreateCollection, onDeleteCollection, onUpdateCollection }) {
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(blankForm);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredCollections = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return collections;
    return collections.filter((collection) =>
      [collection.title, collection.matchTag].some((value) => String(value || "").toLowerCase().includes(search))
    );
  }, [collections, query]);

  function assignedProductIdsExcept(collectionId = "") {
    const assigned = new Set();
    collections.forEach((collection) => {
      if (String(collection.id || collection._id) === String(collectionId)) return;
      (collection.productIds || []).forEach((id) => assigned.add(String(id)));
    });
    return assigned;
  }

  function availableProducts(collectionId = "", selectedIds = []) {
    const assigned = assignedProductIdsExcept(collectionId);
    const selected = new Set(selectedIds.map(String));
    return products.filter((product) => !assigned.has(productId(product)) || selected.has(productId(product)));
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateEditForm(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setMessage("Collection title is required.");
      return;
    }
    setSaving(true);
    try {
      await onCreateCollection({
        description: form.description,
        image: form.image,
        matchTag: form.matchTag || form.title,
        productIds: form.productIds,
        title: form.title
      });
      setForm(blankForm);
      setMessage(form.productIds.length ? "Collection added." : "Collection added without products. You can assign products later.");
    } catch (error) {
      setMessage(error.message || "Unable to save collection.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();
    if (!editForm.title.trim()) {
      setMessage("Collection title is required.");
      return;
    }
    setSaving(true);
    try {
      await onUpdateCollection(editingId, {
        description: editForm.description,
        image: editForm.image,
        matchTag: editForm.matchTag || editForm.title,
        productIds: editForm.productIds,
        title: editForm.title
      });
      setEditingId("");
      setEditForm(blankForm);
      setMessage("Collection updated.");
    } catch (error) {
      setMessage(error.message || "Unable to update collection.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(collection) {
    setEditingId(String(collection.id || collection._id));
    setEditForm({
      description: collection.description || "",
      image: collection.image || "",
      matchTag: collection.matchTag || "",
      productIds: collection.productIds || [],
      title: collection.title || ""
    });
  }

  async function confirmDelete(collection) {
    if (!window.confirm("Are you sure you want to delete this collection?")) return;
    await onDeleteCollection(String(collection.id || collection._id));
    setMessage("Collection deleted. Products were not deleted.");
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-black/10 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-bold text-black/55">Collections</p>
          <h2 className="text-2xl font-black">Collection Management</h2>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-black/10 px-3 py-2 xl:w-80">
          <Search className="h-4 w-4 text-black/45" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search and filter"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-b border-black/10 bg-[#fafaf8] p-5">
        <div className="mb-4">
          <CollectionImageUpload image={form.image} onChange={(image) => updateForm("image", image)} />
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <input
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
            placeholder="Collection title"
            className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700"
          />
          <input
            value={form.matchTag}
            onChange={(event) => updateForm("matchTag", event.target.value)}
            placeholder="Optional matching tag"
            className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700"
          />
          <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f1f1f] px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
            <Plus className="h-4 w-4" />
            {saving ? "Saving..." : "Add collection"}
          </button>
        </div>
        <textarea
          value={form.description}
          onChange={(event) => updateForm("description", event.target.value)}
          placeholder="Collection description"
          rows="2"
          className="mt-3 w-full resize-none rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700"
        />
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold text-black/55">Available unassigned products</p>
          <p className="mb-2 text-xs text-black/45">Products already assigned to another collection are hidden.</p>
          <ProductPicker
            emptyText="All products are already assigned to collections."
            products={availableProducts("", form.productIds)}
            selectedIds={form.productIds}
            onChange={(ids) => updateForm("productIds", ids)}
          />
        </div>
      </form>

      {message && <p className="mx-5 mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}

      <div className="overflow-x-auto p-5">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-y border-black/10 bg-[#f8f8f6] text-xs uppercase tracking-[0.12em] text-black/55">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Product conditions</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCollections.map((collection) => {
              const id = String(collection.id || collection._id);
              const isEditing = editingId === id;
              const image = collection.image || products.find((product) => (collection.productIds || []).map(String).includes(productId(product)))?.image;
              const assignedCount = collectionProductCount(collection, products);

              return (
                <tr key={id} className="border-b border-black/10 align-top">
                  {isEditing ? (
                    <td colSpan="4" className="px-4 py-4">
                      <form onSubmit={handleUpdate} className="rounded-2xl border border-black/10 bg-[#fafaf8] p-4">
                        <div className="mb-4">
                          <CollectionImageUpload image={editForm.image} onChange={(image) => updateEditForm("image", image)} />
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <input
                            value={editForm.title}
                            onChange={(event) => updateEditForm("title", event.target.value)}
                            className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700"
                          />
                          <input
                            value={editForm.matchTag}
                            onChange={(event) => updateEditForm("matchTag", event.target.value)}
                            className="rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700"
                          />
                        </div>
                        <textarea
                          value={editForm.description}
                          onChange={(event) => updateEditForm("description", event.target.value)}
                          placeholder="Collection description"
                          rows="2"
                          className="mt-3 w-full resize-none rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-emerald-700"
                        />
                        <div className="mt-3">
                          <p className="mb-1 text-xs font-bold text-black/55">Current products in this collection</p>
                          <p className="mb-2 text-xs text-black/45">You can keep current products or add unassigned products below.</p>
                          <ProductPicker
                            emptyText="No unassigned products available."
                            products={availableProducts(id, editForm.productIds)}
                            selectedIds={editForm.productIds}
                            onChange={(ids) => updateEditForm("productIds", ids)}
                          />
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingId("")} className="inline-flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 font-bold">
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                          <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
                            <Save className="h-4 w-4" />
                            {saving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-black/10 bg-white">
                            {image ? (
                              <img src={image} alt={collection.title} className="h-full w-full object-cover" />
                            ) : (
                              <ImagePlus className="h-5 w-5 text-black/40" />
                            )}
                          </div>
                          <span className="font-black">{collection.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">{assignedCount}</td>
                      <td className="px-4 py-4 text-black/70">{collection.matchTag || "Manual product selection"}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(collection)} className="rounded-lg bg-black/10 p-2 text-black" aria-label="Edit collection">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => confirmDelete(collection)} className="rounded-lg bg-red-50 p-2 text-red-700" aria-label="Delete collection">
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
        {!filteredCollections.length && (
          <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm font-bold text-black/55">
            No collections yet. Create your first catalog.
          </div>
        )}
      </div>
    </section>
  );
}
