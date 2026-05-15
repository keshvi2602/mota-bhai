import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "fs/promises";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { Collection } from "../src/models/Collection.js";
import { Order } from "../src/models/Order.js";
import { Product } from "../src/models/Product.js";
import { Review } from "../src/models/Review.js";
import { Theme } from "../src/models/Theme.js";
import { User } from "../src/models/User.js";
import { configureMongoDns, getMongoUri, getMongoUriError } from "../src/utils/mongoUri.js";
import { normalizeTags, slugify } from "../src/utils/seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(serverDir, "..");

dotenv.config({ path: path.join(repoDir, ".env") });
dotenv.config({ path: path.join(serverDir, ".env"), override: true });

const dataDir = path.join(serverDir, "data");
const backupJsonPath = path.join(repoDir, "backup", "mota-bhai-localstorage-backup.json");
const stats = {
  products: { found: 0, inserted: 0, updated: 0 },
  collections: { found: 0, inserted: 0, updated: 0 },
  orders: { found: 0, inserted: 0, updated: 0 },
  reviews: { found: 0, inserted: 0, updated: 0 },
  settings: { found: 0, inserted: 0, updated: 0 },
  skipped: 0
};
const legacyProductIdMap = new Map();

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

async function readJson(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    if (!text.trim()) return fallback;
    return JSON.parse(text);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    console.warn(`Skipping unreadable JSON ${filePath}: ${error.message}`);
    return fallback;
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (isObject(value)) return Object.values(value).filter(isObject);
  return [];
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function flattenObjects(value, depth = 0) {
  if (depth > 5) return [];
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return parsed.flatMap((item) => flattenObjects(item, depth + 1));
  if (!isObject(parsed)) return [];
  return [parsed, ...Object.values(parsed).flatMap((item) => flattenObjects(item, depth + 1))];
}

function hasProductShape(item) {
  return isObject(item) && (item.name || item.title) && (item.price !== undefined || item.image || item.category);
}

function hasCollectionShape(item) {
  return isObject(item) && (item.title || item.name || item.handle || item.slug || item.productIds || item.products) && item.price === undefined;
}

function hasOrderShape(item) {
  return isObject(item) && (item.orderId || item.orderNumber || item.customer || item.items) && !item.price;
}

function hasReviewShape(item) {
  return isObject(item) && item.name && item.message && item.rating;
}

async function loadLegacyData() {
  const products = asArray(await readJson(path.join(dataDir, "products.json"), []));
  const collections = asArray(await readJson(path.join(dataDir, "collections.json"), []));
  const orders = asArray(await readJson(path.join(dataDir, "orders.json"), []));
  const reviews = asArray(await readJson(path.join(dataDir, "reviews.json"), []));
  const settings = await readJson(path.join(dataDir, "settings.json"), null)
    || await readJson(path.join(dataDir, "theme.json"), null);
  const browserBackup = await readJson(backupJsonPath, null);

  if (browserBackup) {
    for (const [key, value] of Object.entries(browserBackup)) {
      const lowerKey = key.toLowerCase();
      const objects = flattenObjects(value);
      if (lowerKey.includes("product")) products.push(...objects.filter(hasProductShape));
      if (lowerKey.includes("collection") || lowerKey.includes("catalog")) collections.push(...objects.filter(hasCollectionShape));
      if (lowerKey.includes("order")) orders.push(...objects.filter(hasOrderShape));
      if (lowerKey.includes("review")) reviews.push(...objects.filter(hasReviewShape));
    }
  }

  return { collections, orders, products, reviews, settings };
}

function objectIdOrNull(value) {
  const id = String(value || "");
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

async function findExistingProduct(raw, payload) {
  const candidates = [];
  const objectId = objectIdOrNull(raw._id);
  if (objectId) candidates.push({ _id: objectId });
  if (payload.legacyId) candidates.push({ legacyId: payload.legacyId });
  if (payload.sku) candidates.push({ sku: payload.sku });
  if (payload.slug) candidates.push({ slug: payload.slug });
  if (payload.name) candidates.push({ name: payload.name });
  return candidates.length ? Product.findOne({ $or: candidates }) : null;
}

async function upsertProducts(products) {
  for (const raw of products) {
    stats.products.found += 1;
    const name = String(raw.name || raw.title || "").trim();
    const price = Number(raw.price || raw.salePrice || 0);
    const image = String(raw.image || raw.imageUrl || raw.photo || "").trim();
    if (!name || price < 0) {
      stats.skipped += 1;
      continue;
    }

    const legacyId = String(raw.id || raw._id || "").trim();
    const tags = normalizeTags(raw.tags || raw.tag || raw.category);
    const payload = {
      category: String(raw.category || tags[0] || "Premium Collection"),
      description: String(raw.description || ""),
      discountMoney: Number(raw.discountMoney || raw.discount || 0),
      image,
      isActive: raw.isActive !== false,
      legacyId,
      name,
      price,
      sku: String(raw.sku || "").trim(),
      slug: String(raw.slug || slugify(name)).trim(),
      tag: String(raw.tag || tags[0] || "New Arrival"),
      tags
    };

    const existing = await findExistingProduct(raw, payload);
    const objectId = objectIdOrNull(raw._id);
    let saved;
    if (existing) {
      saved = await Product.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true });
      stats.products.updated += 1;
    } else {
      saved = await Product.create({ ...(objectId ? { _id: objectId } : {}), ...payload });
      stats.products.inserted += 1;
    }
    if (legacyId) legacyProductIdMap.set(legacyId, saved._id.toString());
    legacyProductIdMap.set(saved._id.toString(), saved._id.toString());
  }
}

async function findExistingCollection(raw, payload) {
  const candidates = [];
  const objectId = objectIdOrNull(raw._id);
  if (objectId) candidates.push({ _id: objectId });
  if (payload.legacyId) candidates.push({ legacyId: payload.legacyId });
  if (payload.handle) candidates.push({ handle: payload.handle });
  if (payload.title) candidates.push({ title: payload.title });
  return candidates.length ? Collection.findOne({ $or: candidates }) : null;
}

async function upsertCollections(collections) {
  for (const raw of collections) {
    stats.collections.found += 1;
    const title = String(raw.title || raw.name || "").trim();
    if (!title) {
      stats.skipped += 1;
      continue;
    }
    const legacyId = String(raw.id || raw._id || "").trim();
    const productIds = [...new Set([...(raw.productIds || []), ...(raw.products || [])]
      .map((id) => legacyProductIdMap.get(String(id)) || String(id))
      .filter((id) => mongoose.Types.ObjectId.isValid(id)))];
    const handle = String(raw.handle || raw.slug || slugify(title)).trim();
    const payload = {
      description: String(raw.description || ""),
      handle,
      image: String(raw.image || raw.imageUrl || ""),
      legacyId,
      matchTag: String(raw.matchTag || raw.category || title),
      productIds,
      products: productIds.map((id) => new mongoose.Types.ObjectId(id)),
      title
    };

    const existing = await findExistingCollection(raw, payload);
    const objectId = objectIdOrNull(raw._id);
    if (existing) {
      await Collection.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true });
      stats.collections.updated += 1;
    } else {
      await Collection.create({ ...(objectId ? { _id: objectId } : {}), ...payload });
      stats.collections.inserted += 1;
    }
  }
}

async function findExistingOrder(raw, payload) {
  const candidates = [];
  const objectId = objectIdOrNull(raw._id);
  if (objectId) candidates.push({ _id: objectId });
  if (payload.legacyId) candidates.push({ legacyId: payload.legacyId });
  if (payload.orderId) candidates.push({ orderId: payload.orderId });
  return candidates.length ? Order.findOne({ $or: candidates }) : null;
}

async function upsertOrders(orders) {
  for (const raw of orders) {
    stats.orders.found += 1;
    const customer = raw.customer || raw;
    const items = asArray(raw.items).map((item) => ({
      image: String(item.image || ""),
      name: String(item.name || item.title || "Product"),
      price: Number(item.price || 0),
      productId: String(item.productId || item.id || item._id || ""),
      quantity: Math.max(1, Number(item.quantity || 1))
    }));
    if (!items.length || !String(customer.name || customer.customerName || "").trim()) {
      stats.skipped += 1;
      continue;
    }
    const legacyId = String(raw.id || raw._id || raw.orderNumber || "").trim();
    const payload = {
      address: String(customer.address || ""),
      customer: {
        address: String(customer.address || ""),
        name: String(customer.name || customer.customerName || ""),
        note: String(customer.note || ""),
        phone: String(customer.phone || customer.mobile || "")
      },
      customerName: String(customer.name || customer.customerName || ""),
      items,
      legacyId,
      orderId: String(raw.orderId || raw.orderNumber || `MB-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
      phone: String(customer.phone || customer.mobile || ""),
      status: String(raw.status || "Pending"),
      total: Number(raw.total || items.reduce((sum, item) => sum + item.price * item.quantity, 0))
    };

    const existing = await findExistingOrder(raw, payload);
    const objectId = objectIdOrNull(raw._id);
    if (existing) {
      await Order.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true });
      stats.orders.updated += 1;
    } else {
      await Order.create({ ...(objectId ? { _id: objectId } : {}), ...payload });
      stats.orders.inserted += 1;
    }
  }
}

async function upsertReviews(reviews) {
  for (const raw of reviews) {
    stats.reviews.found += 1;
    if (!raw.name || !raw.message || !raw.rating) {
      stats.skipped += 1;
      continue;
    }
    const payload = {
      city: String(raw.city || ""),
      isPublished: raw.isPublished !== false,
      message: String(raw.message),
      name: String(raw.name),
      rating: Number(raw.rating),
      title: String(raw.title || "")
    };
    const existing = await Review.findOne({ name: payload.name, message: payload.message });
    if (existing) {
      await Review.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true });
      stats.reviews.updated += 1;
    } else {
      await Review.create(payload);
      stats.reviews.inserted += 1;
    }
  }
}

async function upsertSettings(settings) {
  if (!settings || !isObject(settings)) return;
  stats.settings.found = 1;
  const existing = await Theme.findOne({ name: "default" });
  await Theme.findOneAndUpdate(
    { name: "default" },
    { themeConfig: settings.themeConfig || settings },
    { new: true, upsert: true }
  );
  if (existing) stats.settings.updated = 1;
  else stats.settings.inserted = 1;
}

async function seedAdminFromEnv() {
  const email = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = String(process.env.ADMIN_PASSWORD || "");
  if (!email || !password) return;
  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate(
    { email },
    { $set: { email, passwordHash, role: "admin", name: "Mota Bhai Admin" } },
    { new: true, upsert: true }
  );
}

async function backupDataDirectory() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(serverDir, `data-backup-before-mongo-migration-${timestamp}`);
  await fs.mkdir(backupDir, { recursive: true });
  try {
    await fs.cp(dataDir, backupDir, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return backupDir;
}

async function main() {
  const mongoUri = getMongoUri();
  const mongoUriError = getMongoUriError(mongoUri);
  if (mongoUriError) throw new Error(mongoUriError);

  const backupDir = await backupDataDirectory();
  console.log(`Backup created: ${backupDir}`);

  configureMongoDns(mongoUri);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);

  const legacyData = await loadLegacyData();
  await upsertProducts(legacyData.products);
  await upsertCollections(legacyData.collections);
  await upsertOrders(legacyData.orders);
  await upsertReviews(legacyData.reviews);
  await upsertSettings(legacyData.settings);
  await seedAdminFromEnv();

  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close(true);
  });
