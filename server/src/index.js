import bcrypt from "bcryptjs";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { requireAdmin } from "./middleware/auth.js";
import { Collection } from "./models/Collection.js";
import { Order } from "./models/Order.js";
import { OtpVerification } from "./models/OtpVerification.js";
import { Product } from "./models/Product.js";
import { Theme } from "./models/Theme.js";
import { User } from "./models/User.js";
import reviewRoutes from "./routes/reviews.js";
import { ensureAdminUser, normalizeTags, slugify } from "./utils/seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || "dev-only-change-this-secret";
const OTP_TTL_MS = Math.max(1, Number(process.env.OTP_EXPIRY_MINUTES || 10)) * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const allowedOrigins = new Set([
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json({ limit: "100mb" }));
app.use("/api/reviews", reviewRoutes);

const defaultTheme = {
  primaryColor: "#d4af37",
  buttonColor: "#d4af37",
  backgroundColor: "#050914",
  surfaceColor: "#0b1224",
  logoUrl: "",
  content: {
    headerLeftText: "Fine Gujarati Snacks",
    headerCenterTitle: "Mota Bhai",
    headerCenterSubtitle: "Fine Gujarati Snacks"
  }
};

let mongoConnected = false;
let smtpConfigured = false;
let memoryAdmin = null;
let memoryTheme = { name: "default", themeConfig: defaultTheme };
let memoryCollections = [
  {
    id: 1,
    title: "Signature Namkeen",
    handle: "signature-namkeen",
    matchTag: "Signature Namkeen",
    productIds: ["1", "2", "3", "4"],
    description: "Premium crunchy snacks"
  },
  {
    id: 2,
    title: "Luxury Gifting",
    handle: "luxury-gifting",
    matchTag: "Luxury Gifting",
    productIds: ["4"],
    description: "Gift-ready hampers"
  }
];
let memoryProducts = [
  {
    id: 1,
    name: "Imperial Mix Chavana",
    category: "Signature Namkeen",
    description: "Slow-roasted sev, lentils, peanuts, and a measured masala finish.",
    price: 5.99,
    discountMoney: 0,
    tag: "Best Seller",
    tags: ["Best Seller", "Signature Namkeen"],
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",
    isActive: true
  },
  {
    id: 2,
    name: "Gold Leaf Jeera Khakhra",
    category: "Handmade Khakhra",
    description: "Paper-thin wheat khakhra with toasted cumin and a crisp ghee aroma.",
    price: 4.49,
    discountMoney: 0,
    tag: "Handmade",
    tags: ["Handmade", "Khakhra"],
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=85",
    isActive: true
  },
  {
    id: 3,
    name: "Royal Masala Thepla",
    category: "Travel Ready",
    description: "Soft spiced thepla packed for work, flights, gifting, and midnight chai.",
    price: 7.99,
    discountMoney: 0,
    tag: "Fresh Batch",
    tags: ["Fresh Batch", "Travel Ready"],
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=85",
    isActive: true
  },
  {
    id: 4,
    name: "Prestige Farsan Hamper",
    category: "Luxury Gifting",
    description: "An assorted festive box with premium packaging and family-size portions.",
    price: 14.99,
    discountMoney: 0,
    tag: "Gift Ready",
    tags: ["Gift Ready", "Luxury Gifting"],
    image: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=900&q=85",
    isActive: true
  }
];
let orders = [];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function productKey(product) {
  const id = product?.id || product?._id;
  if (id !== undefined && id !== null && String(id).trim()) return `id:${String(id)}`;
  return `name:${String(product?.name || "").trim().toLowerCase()}`;
}

function collectionKeys(collection) {
  return [
    collection?.id || collection?._id ? `id:${String(collection.id || collection._id)}` : "",
    collection?.handle ? `handle:${String(collection.handle).trim().toLowerCase()}` : "",
    collection?.title || collection?.name ? `title:${String(collection.title || collection.name).trim().toLowerCase()}` : ""
  ].filter(Boolean);
}

function orderKey(order) {
  return String(order?.orderId || order?.id || order?._id || `${order?.customer?.phone || ""}-${order?.createdAt || ""}`);
}

function normalizeProductInput(product) {
  const tags = normalizeTags(product.tags || product.tag || product.category);
  const id = product.id || product._id || Date.now() + Math.floor(Math.random() * 100000);
  return {
    ...product,
    id: String(id),
    category: product.category || tags[0] || "Premium Collection",
    description: product.description || "Premium curated product.",
    discountMoney: Number(product.discountMoney || 0),
    image: product.image || "",
    isActive: product.isActive !== false,
    name: String(product.name || "").trim(),
    price: Number(product.price || 0),
    tag: product.tag || tags[0] || "New Arrival",
    tags,
    createdAt: product.createdAt || new Date().toISOString()
  };
}

function normalizeCollectionInput(collection, index = 0) {
  const title = String(collection.title || collection.name || "").trim();
  const handle = String(collection.handle || collection.slug || slugify(title) || `collection-${Date.now()}-${index}`).trim();
  return {
    ...collection,
    id: String(collection.id || collection._id || Date.now() + index),
    title,
    handle,
    matchTag: String(collection.matchTag || collection.category || title).trim(),
    image: collection.image || "",
    description: collection.description || "",
    productIds: Array.isArray(collection.productIds) ? collection.productIds.map(String) : []
  };
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function flattenValues(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return [];
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return parsed.flatMap((item) => flattenValues(item, depth + 1));
  if (typeof parsed !== "object") return [];
  const nested = Object.values(parsed).flatMap((item) => flattenValues(item, depth + 1));
  return [parsed, ...nested];
}

function hasProductShape(item) {
  return item && typeof item === "object" && item.name && (item.price !== undefined || item.image || item.category);
}

function hasCollectionShape(item) {
  return item && typeof item === "object" && (item.title || item.handle || item.productIds) && !item.price;
}

function hasOrderShape(item) {
  return item && typeof item === "object" && (item.orderId || item.customer || item.items) && !item.price;
}

function hasAdminProfileShape(item) {
  return item && typeof item === "object" && !hasProductShape(item) && (item.email || item.profileImage || item.role === "admin");
}

function extractRecoveryData(payload = {}) {
  const localStorageData = payload.localStorage || payload.backup || payload;
  const sourceKeys = Object.keys(localStorageData || {});
  const recovered = {
    admin: null,
    collections: [],
    orders: [],
    products: [],
    sourceKeys,
    theme: null
  };

  for (const [key, rawValue] of Object.entries(localStorageData || {})) {
    const lowerKey = key.toLowerCase();
    const value = parseMaybeJson(rawValue);
    const values = flattenValues(value);

    if (lowerKey.includes("product")) {
      recovered.products.push(...values.filter(hasProductShape));
    }
    if (lowerKey.includes("collection") || lowerKey.includes("catalog")) {
      recovered.collections.push(...values.filter(hasCollectionShape));
    }
    if (lowerKey.includes("order")) {
      recovered.orders.push(...values.filter(hasOrderShape));
    }
    if (lowerKey.includes("theme") || lowerKey.includes("storefront") || lowerKey.includes("content")) {
      const themeCandidate = values.find((item) => item && typeof item === "object" && !Array.isArray(item));
      if (themeCandidate) recovered.theme = themeCandidate.themeConfig || themeCandidate;
    }
    if (lowerKey.includes("admin") || lowerKey.includes("profile")) {
      const adminCandidate = values.find(hasAdminProfileShape);
      if (adminCandidate) recovered.admin = adminCandidate;
    }

    if (Array.isArray(value)) {
      if (value.every(hasProductShape)) recovered.products.push(...value);
      if (value.every(hasCollectionShape)) recovered.collections.push(...value);
      if (value.every(hasOrderShape)) recovered.orders.push(...value);
    }
  }

  if (Array.isArray(payload.products)) recovered.products.push(...payload.products);
  if (Array.isArray(payload.collections)) recovered.collections.push(...payload.collections);
  if (Array.isArray(payload.orders)) recovered.orders.push(...payload.orders);
  if (payload.theme) recovered.theme = payload.theme.themeConfig || payload.theme;
  if (payload.admin) recovered.admin = payload.admin;

  return recovered;
}

function mergeProducts(existingProducts, recoveredProducts) {
  const merged = new Map(existingProducts.map((product) => [productKey(product), product]));
  let recoveredCount = 0;
  for (const rawProduct of recoveredProducts) {
    const product = normalizeProductInput(rawProduct);
    if (!product.name || !product.image || Number(product.price) <= 0) continue;
    const key = productKey(product);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, ...product, id: existing.id || product.id } : product);
    recoveredCount += existing ? 0 : 1;
  }
  return { products: [...merged.values()], recoveredCount };
}

function mergeCollections(existingCollections, recoveredCollections, products) {
  const merged = [...existingCollections];
  let recoveredCount = 0;
  for (const [index, rawCollection] of recoveredCollections.entries()) {
    const collection = normalizeCollectionInput(rawCollection, index);
    if (!collection.title) continue;
    const existingIndex = merged.findIndex((item) => {
      const keys = collectionKeys(collection);
      return collectionKeys(item).some((key) => keys.includes(key));
    });
    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...collection,
        id: merged[existingIndex].id || collection.id,
        productIds: [...new Set([...(merged[existingIndex].productIds || []), ...(collection.productIds || [])].map(String))]
      };
    } else {
      merged.push(collection);
      recoveredCount += 1;
    }
  }

  if (!recoveredCollections.length && products.length) {
    const byCategory = new Map();
    for (const product of products) {
      const title = String(product.category || product.tags?.[0] || "Recovered Products").trim();
      if (!byCategory.has(title)) byCategory.set(title, []);
      byCategory.get(title).push(String(product.id || product._id));
    }
    for (const [title, productIds] of byCategory.entries()) {
      if (merged.some((collection) => String(collection.title).toLowerCase() === title.toLowerCase())) continue;
      merged.push(normalizeCollectionInput({ title, matchTag: title, productIds, description: "" }, merged.length));
      recoveredCount += 1;
    }
  }

  return { collections: merged, recoveredCount };
}

function mergeOrders(existingOrders, recoveredOrders) {
  const merged = new Map(existingOrders.map((order) => [orderKey(order), order]));
  let recoveredCount = 0;
  for (const order of recoveredOrders) {
    const key = orderKey(order);
    if (!key.trim()) continue;
    if (!merged.has(key)) recoveredCount += 1;
    merged.set(key, { ...order, orderId: order.orderId || key, createdAt: order.createdAt || new Date().toISOString() });
  }
  return { orders: [...merged.values()], recoveredCount };
}

async function persistMemoryStore() {
  return null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(value)) return "Password must include at least 1 uppercase letter.";
  if (!/[a-z]/.test(value)) return "Password must include at least 1 lowercase letter.";
  if (!/[0-9]/.test(value)) return "Password must include at least 1 number.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Password must include at least 1 special character.";
  return "";
}

function createOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function getSmtpTransporter() {
  const missingFields = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter((field) => !String(process.env[field] || "").trim());
  if (missingFields.length) {
    const error = new Error(`Email service not configured. Missing: ${missingFields.join(", ")}.`);
    error.status = 503;
    throw error;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function getSmtpFromAddress() {
  if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
  const fromName = process.env.OTP_FROM_NAME || "Mota Bhai";
  const fromEmail = process.env.OTP_FROM_EMAIL || process.env.SMTP_USER;
  return `"${fromName}" <${fromEmail}>`;
}

async function verifySmtpConfiguration() {
  try {
    const transporter = getSmtpTransporter();
    await transporter.verify();
    smtpConfigured = true;
    return true;
  } catch (error) {
    const message = error.message || "SMTP verification failed.";
    if (process.env.NODE_ENV === "development") {
      console.warn(message);
    } else {
      console.warn("SMTP is not configured or could not be verified.");
    }
    smtpConfigured = false;
    return false;
  }
}

async function sendOtpEmail(to, otp) {
  const transporter = getSmtpTransporter();
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">
      <p>Hello Admin,</p>
      <p>Your Mota Bhai verification code is:</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:4px;color:#111827">${otp}</p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p><strong>Mota Bhai Security</strong></p>
    </div>
  `;
  const text = [
    "Hello Admin,",
    "",
    "Your Mota Bhai verification code is:",
    "",
    otp,
    "",
    "This code will expire in 10 minutes.",
    "",
    "If you did not request this, please ignore this email.",
    "",
    "Mota Bhai Security"
  ].join("\n");

  await transporter.sendMail({
    from: getSmtpFromAddress(),
    to,
    subject: "Mota Bhai Admin Verification Code",
    html,
    text
  });
  return { delivered: true };
}

function canSendOtp(admin) {
  if (!admin.otpLastSentAt) return true;
  return Date.now() - new Date(admin.otpLastSentAt).getTime() >= OTP_COOLDOWN_MS;
}

async function setAdminOtp(admin, purpose, toEmail, extra = {}) {
  if (!canSendOtp(admin)) {
    const waitSeconds = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - new Date(admin.otpLastSentAt).getTime())) / 1000);
    const error = new Error(`Please wait ${waitSeconds} seconds before requesting another OTP.`);
    error.status = 429;
    throw error;
  }

  const otp = createOtp();
  const otpHash = await bcrypt.hash(otp, 12);
  await sendOtpEmail(toEmail, otp);
  Object.assign(admin, {
    otpHash,
    otpPurpose: purpose,
    otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
    otpAttempts: 0,
    otpLastSentAt: new Date(),
    otpPendingEmail: extra.otpPendingEmail || "",
    otpPendingPasswordHash: extra.otpPendingPasswordHash || ""
  });
  await saveAdmin(admin);
}

async function verifyAdminOtp(admin, purpose, otp) {
  if (!admin.otpHash || admin.otpPurpose !== purpose) {
    return { ok: false, message: "OTP request not found. Please send a new OTP." };
  }
  if (!admin.otpExpiresAt || new Date(admin.otpExpiresAt).getTime() < Date.now()) {
    clearAdminOtp(admin);
    await saveAdmin(admin);
    return { ok: false, message: "OTP expired. Please send a new OTP." };
  }
  if (Number(admin.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    return { ok: false, message: "Too many wrong OTP attempts. Please send a new OTP." };
  }

  const isValid = await bcrypt.compare(String(otp || ""), admin.otpHash);
  if (!isValid) {
    admin.otpAttempts = Number(admin.otpAttempts || 0) + 1;
    await saveAdmin(admin);
    return {
      ok: false,
      message: admin.otpAttempts >= OTP_MAX_ATTEMPTS
        ? "Too many wrong OTP attempts. Please send a new OTP."
        : "Invalid OTP."
    };
  }

  return { ok: true };
}

function clearAdminOtp(admin) {
  Object.assign(admin, {
    otpHash: "",
    otpPurpose: "",
    otpExpiresAt: null,
    otpAttempts: 0,
    otpLastSentAt: null,
    otpPendingEmail: "",
    otpPendingPasswordHash: ""
  });
}

async function saveAdmin(admin) {
  if (!mongoConnected) {
    const error = new Error("Database is not connected. Please start MongoDB and try again.");
    error.status = 503;
    throw error;
  }
  return admin.save ? admin.save() : mongoose.model("User").findOneAndUpdate({ email: admin.email }, admin, { new: true });
}

async function findAdminByEmail(email) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  if (!mongoConnected) {
    return null;
  }
  return mongoose.model("User").findOne({ email: normalizedEmail });
}

async function getRequestAdmin(request) {
  return findAdminByEmail(request.admin?.email);
}

function toClientAdmin(admin) {
  return {
    email: admin.email,
    name: admin.name || "Mota Bhai Admin",
    profileImage: admin.profileImage || "",
    role: admin.role || "admin"
  };
}

function toClientProduct(product) {
  const raw = product.toObject ? product.toObject() : product;
  return {
    ...raw,
    id: raw._id?.toString?.() || raw.id,
    tag: raw.tag || raw.tags?.[0] || "New Arrival",
    tags: raw.tags || []
  };
}

function toClientCollection(collection) {
  const raw = collection.toObject ? collection.toObject() : collection;
  const objectProductIds = (raw.products || []).map((id) => id?.toString?.() || String(id));
  return {
    ...raw,
    id: raw._id?.toString?.() || raw.id,
    productIds: normalizeProductIds(raw.productIds?.length ? raw.productIds : objectProductIds)
  };
}

function collectionProductMatcher(collection) {
  return (product) => {
    const productId = String(product.id || product._id);
    return (collection.productIds || []).map(String).includes(productId);
  };
}

function normalizeThemeConfig(themeConfig = {}) {
  const currentContent = themeConfig.content || {};
  const legacyLeftText = currentContent.headerLeftText || currentContent.topMiniTagline || "Fine Gujarati Snacks";
  const legacyTitle = currentContent.headerCenterTitle || currentContent.storeName || "Mota Bhai";
  const legacySubtitle = currentContent.headerCenterSubtitle || currentContent.topMiniTagline || "Fine Gujarati Snacks";

  return {
    ...defaultTheme,
    ...themeConfig,
    content: {
      ...(defaultTheme.content || {}),
      ...currentContent,
      headerLeftText: legacyLeftText,
      headerCenterTitle: legacyTitle,
      headerCenterSubtitle: legacySubtitle,
      storeName: currentContent.storeName || legacyTitle,
      topMiniTagline: currentContent.topMiniTagline || legacyLeftText
    }
  };
}

function normalizeProductIds(productIds = []) {
  return [...new Set((Array.isArray(productIds) ? productIds : []).map(String).filter(Boolean))];
}

async function findProductAssignmentConflict(productIds, currentCollectionId = "") {
  const ids = normalizeProductIds(productIds);
  if (!ids.length) return null;

  if (!mongoConnected) {
    return memoryCollections.find((collection) => {
      const collectionId = String(collection.id || collection._id);
      if (collectionId === String(currentCollectionId)) return false;
      return (collection.productIds || []).some((id) => ids.includes(String(id)));
    });
  }

  const query = {
    productIds: { $in: ids },
    ...(currentCollectionId && mongoose.Types.ObjectId.isValid(currentCollectionId)
      ? { _id: { $ne: currentCollectionId } }
      : {})
  };
  return Collection.findOne(query);
}

async function toClientOrder(order) {
  const raw = order.toObject ? order.toObject() : order;
  return {
    ...raw,
    id: raw._id?.toString?.() || raw.id,
    status: raw.status || "Pending"
  };
}

function handleOtpError(error, response) {
  if (process.env.NODE_ENV === "development") {
    console.error(error);
  }
  const status = error.status || 500;
  const message = status === 503
    ? error.message
    : "Unable to send OTP email. Check SMTP settings.";
  return response.status(status).json({ message });
}

function databaseUnavailableResponse(response) {
  return response.status(503).json({ message: "Database is not connected. Please start MongoDB and try again." });
}

function requireDatabase(request, response, next) {
  if (!mongoConnected || mongoose.connection.readyState !== 1) {
    return databaseUnavailableResponse(response);
  }
  return next();
}

async function createEmailOtp(email) {
  getSmtpTransporter();

  if (!mongoConnected) {
    const error = new Error("Database is not connected. OTP verification requires MongoDB.");
    error.status = 503;
    throw error;
  }

  const recentOtp = await OtpVerification.findOne({
    email,
    createdAt: { $gte: new Date(Date.now() - OTP_COOLDOWN_MS) },
    verified: false
  }).sort({ createdAt: -1 });

  if (recentOtp) {
    const waitSeconds = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - recentOtp.createdAt.getTime())) / 1000);
    const error = new Error(`Please wait ${waitSeconds} seconds before requesting another OTP.`);
    error.status = 429;
    throw error;
  }

  const otp = createOtp();
  await OtpVerification.deleteMany({ email });

  const otpHash = await bcrypt.hash(otp, 12);
  const savedOtp = await OtpVerification.create({
    email,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    otpHash,
    verified: false
  });

  try {
    await sendOtpEmail(email, otp);
  } catch (error) {
    await OtpVerification.deleteOne({ _id: savedOtp._id });
    throw error;
  }
}

function makeUniqueMemoryHandle(title, excludeId = "") {
  const baseHandle = slugify(title) || `collection-${Date.now()}`;
  let handle = baseHandle;
  let suffix = 2;
  while (
    memoryCollections.some(
      (collection) => collection.handle === handle && String(collection.id || collection._id) !== String(excludeId)
    )
  ) {
    handle = `${baseHandle}-${suffix}`;
    suffix += 1;
  }
  return handle;
}

async function makeUniqueMongoHandle(title, excludeId = "") {
  const baseHandle = slugify(title) || `collection-${Date.now()}`;
  let handle = baseHandle;
  let suffix = 2;
  while (
    await Collection.exists({
      handle,
      ...(excludeId && mongoose.Types.ObjectId.isValid(excludeId) ? { _id: { $ne: excludeId } } : {})
    })
  ) {
    handle = `${baseHandle}-${suffix}`;
    suffix += 1;
  }
  return handle;
}

async function getThemeConfig() {
  if (!mongoConnected) {
    memoryTheme.themeConfig = normalizeThemeConfig(memoryTheme.themeConfig);
    return memoryTheme.themeConfig;
  }

  const theme = await Theme.findOneAndUpdate(
    { name: "default" },
    { $setOnInsert: { themeConfig: normalizeThemeConfig(defaultTheme) } },
    { new: true, upsert: true }
  );
  const normalizedTheme = normalizeThemeConfig(theme.themeConfig);
  if (JSON.stringify(normalizedTheme.content) !== JSON.stringify(theme.themeConfig.content || {})) {
    theme.themeConfig = normalizedTheme;
    await theme.save();
  }
  return normalizedTheme;
}

async function start() {
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000
      });
      mongoConnected = true;
    } catch (error) {
      console.warn(`MongoDB unavailable. CRUD disabled until DB connects: ${error.message}`);
    }
  }

  if (mongoConnected) {
    memoryAdmin = await ensureAdminUser(true);
  } else {
    console.warn("MongoDB unavailable. CRUD disabled until DB connects.");
  }

  const adminEmailLoaded = Boolean(String(process.env.ADMIN_EMAIL || "").trim());
  const adminExists = mongoConnected && adminEmailLoaded
    ? Boolean(await User.exists({ email: String(process.env.ADMIN_EMAIL).toLowerCase().trim() }))
    : false;

  app.listen(port, () => {
    console.log(`Mota Bhai API running on http://localhost:${port}`);
    console.log(`MongoDB connected: ${mongoConnected ? "yes" : "no"}`);
    console.log(`Database name: ${mongoose.connection.name || "unavailable"}`);
    console.log("Store mode: mongodb only");
    console.log(`Admin email loaded: ${adminEmailLoaded ? "yes" : "no"}`);
    console.log(`Admin exists: ${adminExists ? "yes" : "no"}`);
    console.log(`SMTP password configured: ${process.env.SMTP_PASS ? `yes (${String(process.env.SMTP_PASS).length} chars)` : "no"}`);
    verifySmtpConfiguration().then((verified) => {
      console.log(`SMTP verified: ${verified ? "yes" : "no"}`);
    });
  });
}

app.get("/api/health", (request, response) => {
  Promise.all([
    mongoConnected ? Product.countDocuments() : Promise.resolve(0),
    mongoConnected ? Collection.countDocuments() : Promise.resolve(0),
    mongoConnected ? User.exists({ email: (process.env.ADMIN_EMAIL || "").toLowerCase().trim() }) : Promise.resolve(null)
  ])
    .then(([productCount, collectionCount, adminExists]) => {
      response.json({
        api: "ok",
        mongodbConnected: mongoConnected && mongoose.connection.readyState === 1,
        storeMode: "mongodb",
        smtpConfigured,
        productCount,
        collectionCount,
        adminExists: Boolean(adminExists),
        timestamp: new Date().toISOString()
      });
    })
    .catch(() => {
      response.status(500).json({
        api: "error",
        mongodbConnected: mongoConnected && mongoose.connection.readyState === 1,
        storeMode: "mongodb",
        smtpConfigured,
        productCount: 0,
        collectionCount: 0,
        adminExists: false,
        timestamp: new Date().toISOString()
      });
    });
});

async function handleAdminLogin(request, response) {
  if (!mongoConnected) {
    return databaseUnavailableResponse(response);
  }
  const email = String(request.body.email || "").toLowerCase();
  const password = String(request.body.password || "");
  const admin = await findAdminByEmail(email);

  if (!admin) {
    return response.status(401).json({ message: "Admin email not found. Run npm run reset:admin if this is the correct admin email." });
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) {
    return response.status(401).json({ message: "Incorrect admin password. Run npm run reset:admin to sync the password from .env." });
  }

  const token = jwt.sign({ email: admin.email, isAdmin: true, role: "admin" }, jwtSecret, { expiresIn: "8h" });
  return response.json({ token, admin: toClientAdmin(admin) });
}

app.post("/api/auth/login", handleAdminLogin);
app.post("/api/admin/login", handleAdminLogin);
app.post("/api/admin/auth/login", handleAdminLogin);

app.use([
  "/api/products",
  "/api/admin/products",
  "/api/collections",
  "/api/admin/collections",
  "/api/orders",
  "/api/admin/orders",
  "/api/admin/profile",
  "/api/theme",
  "/api/admin/theme"
], requireDatabase);

app.post("/api/auth/send-otp", async (request, response) => {
  const email = String(request.body.email || "").toLowerCase().trim();
  if (!isValidEmail(email)) {
    return response.status(400).json({ message: "Enter a valid email address." });
  }

  try {
    await createEmailOtp(email);
    return response.json({ message: "OTP sent successfully." });
  } catch (error) {
    if (error.status === 429) {
      return response.status(429).json({ message: error.message });
    }
    return handleOtpError(error, response);
  }
});

app.post("/api/auth/verify-otp", async (request, response) => {
  const email = String(request.body.email || "").toLowerCase().trim();
  const otp = String(request.body.otp || "").trim();

  if (!isValidEmail(email) || !otp) {
    return response.status(400).json({ message: "Email and OTP are required." });
  }
  if (!mongoConnected) {
    return response.status(503).json({ message: "Database is not connected. OTP verification requires MongoDB." });
  }

  const savedOtp = await OtpVerification.findOne({
    email,
    verified: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!savedOtp) {
    return response.status(400).json({ message: "OTP expired or not found. Please request a new OTP." });
  }

  const isValidOtp = await bcrypt.compare(otp, savedOtp.otpHash);
  if (!isValidOtp) {
    return response.status(400).json({ message: "Invalid OTP." });
  }

  savedOtp.verified = true;
  await savedOtp.save();
  return response.json({ message: "OTP verified successfully.", verified: true });
});

app.get("/api/auth/smtp-status", async (request, response) => {
  const ok = await verifySmtpConfiguration();
  return response.status(ok ? 200 : 503).json({
    configured: ok,
    message: ok ? "SMTP is configured." : "SMTP is not configured or could not be verified."
  });
});

app.post("/api/admin/auth/forgot-password/send-otp", async (request, response) => {
  const email = String(request.body.email || "").toLowerCase().trim();
  const genericMessage = "OTP sent successfully.";

  if (!isValidEmail(email)) {
    return response.status(400).json({ message: "Enter a valid email address." });
  }

  const admin = await findAdminByEmail(email);
  if (!admin) {
    return response.status(404).json({ message: "Admin email not found." });
  }

  try {
    await setAdminOtp(admin, "forgot-password", admin.email);
    return response.json({ message: genericMessage });
  } catch (error) {
    if (error.status === 429) {
      return response.status(429).json({ message: error.message });
    }
    return handleOtpError(error, response);
  }
});

app.post("/api/admin/auth/forgot-password/reset", async (request, response) => {
  const email = String(request.body.email || "").toLowerCase().trim();
  const otp = String(request.body.otp || "").trim();
  const password = String(request.body.password || "");
  const confirmPassword = String(request.body.confirmPassword || "");

  if (!isValidEmail(email) || !otp) {
    return response.status(400).json({ message: "Email and OTP are required." });
  }
  if (password !== confirmPassword) {
    return response.status(400).json({ message: "Passwords do not match." });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return response.status(400).json({ message: passwordError });
  }

  const admin = await findAdminByEmail(email);
  if (!admin) {
    return response.status(400).json({ message: "Invalid or expired OTP." });
  }

  let verifiedOtp = false;
  if (mongoConnected) {
    const savedOtp = await OtpVerification.findOne({
      email,
      verified: true,
      expiresAt: { $gt: new Date() }
    }).sort({ updatedAt: -1 });
    verifiedOtp = Boolean(savedOtp);
    if (savedOtp) {
      await OtpVerification.deleteMany({ email });
    }
  }

  if (!verifiedOtp) {
    const verification = await verifyAdminOtp(admin, "forgot-password", otp);
    if (!verification.ok) {
      return response.status(400).json({ message: verification.message });
    }
  }

  admin.passwordHash = await bcrypt.hash(password, 12);
  clearAdminOtp(admin);
  await saveAdmin(admin);
  return response.json({ message: "Password reset successfully. Please login." });
});

app.post("/api/admin/profile/change-email/send-otp", requireAdmin, async (request, response) => {
  const admin = await getRequestAdmin(request);
  if (!admin) return response.status(401).json({ message: "Admin session expired." });

  const newEmail = String(request.body.newEmail || "").toLowerCase().trim();
  const currentPassword = String(request.body.currentPassword || "");
  if (!isValidEmail(newEmail)) {
    return response.status(400).json({ message: "Enter a valid new email." });
  }
  if (newEmail === admin.email) {
    return response.status(400).json({ message: "New email cannot be the same as current email." });
  }
  const existingAdmin = await findAdminByEmail(newEmail);
  if (existingAdmin) {
    return response.status(400).json({ message: "This email is already in use." });
  }
  const isValidPassword = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!isValidPassword) {
    return response.status(401).json({ message: "Current password is incorrect." });
  }

  try {
    await setAdminOtp(admin, "change-email", newEmail, { otpPendingEmail: newEmail });
    return response.json({ message: "OTP sent to the new email address." });
  } catch (error) {
    if (error.status === 429) return response.status(429).json({ message: error.message });
    return handleOtpError(error, response);
  }
});

app.post("/api/admin/profile/change-email/verify", requireAdmin, async (request, response) => {
  const admin = await getRequestAdmin(request);
  if (!admin) return response.status(401).json({ message: "Admin session expired." });

  const otp = String(request.body.otp || "").trim();
  if (!otp) return response.status(400).json({ message: "OTP is required." });

  const verification = await verifyAdminOtp(admin, "change-email", otp);
  if (!verification.ok) {
    return response.status(400).json({ message: verification.message });
  }
  const pendingEmail = String(admin.otpPendingEmail || "").toLowerCase().trim();
  if (!isValidEmail(pendingEmail)) {
    return response.status(400).json({ message: "Email change request expired. Please send a new OTP." });
  }
  const existingAdmin = await findAdminByEmail(pendingEmail);
  if (existingAdmin && existingAdmin.email !== admin.email) {
    return response.status(400).json({ message: "This email is already in use." });
  }

  admin.email = pendingEmail;
  clearAdminOtp(admin);
  await saveAdmin(admin);
  return response.json({ message: "Admin email updated successfully. Please login again." });
});

app.post("/api/admin/profile/change-password/send-otp", requireAdmin, async (request, response) => {
  const admin = await getRequestAdmin(request);
  if (!admin) return response.status(401).json({ message: "Admin session expired." });

  const currentPassword = String(request.body.currentPassword || "");
  const newPassword = String(request.body.newPassword || "");
  const confirmPassword = String(request.body.confirmPassword || "");
  const isValidPassword = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!isValidPassword) {
    return response.status(401).json({ message: "Current password is incorrect." });
  }
  if (newPassword !== confirmPassword) {
    return response.status(400).json({ message: "Passwords do not match." });
  }
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return response.status(400).json({ message: passwordError });
  }

  try {
    await setAdminOtp(admin, "change-password", admin.email, {
      otpPendingPasswordHash: await bcrypt.hash(newPassword, 12)
    });
    return response.json({ message: "OTP sent to the current admin email." });
  } catch (error) {
    if (error.status === 429) return response.status(429).json({ message: error.message });
    return handleOtpError(error, response);
  }
});

app.post("/api/admin/profile/change-password/verify", requireAdmin, async (request, response) => {
  const admin = await getRequestAdmin(request);
  if (!admin) return response.status(401).json({ message: "Admin session expired." });

  const otp = String(request.body.otp || "").trim();
  if (!otp) return response.status(400).json({ message: "OTP is required." });

  const verification = await verifyAdminOtp(admin, "change-password", otp);
  if (!verification.ok) {
    return response.status(400).json({ message: verification.message });
  }
  if (!admin.otpPendingPasswordHash) {
    return response.status(400).json({ message: "Password change request expired. Please send a new OTP." });
  }

  admin.passwordHash = admin.otpPendingPasswordHash;
  clearAdminOtp(admin);
  await saveAdmin(admin);
  return response.json({ message: "Password changed successfully. Please login again." });
});

app.get("/api/admin/profile", requireAdmin, async (request, response) => {
  if (!mongoConnected) {
    return response.json(toClientAdmin(memoryAdmin));
  }

  const admin = await mongoose.model("User").findOne({ email: request.admin.email });
  if (!admin) return response.status(404).json({ message: "Admin profile not found." });
  return response.json(toClientAdmin(admin));
});

app.put("/api/admin/profile", requireAdmin, async (request, response) => {
  const profilePayload = {
    name: String(request.body.name || "Mota Bhai Admin").trim(),
    profileImage: String(request.body.profileImage || "").trim()
  };

  if (!mongoConnected) {
    memoryAdmin = { ...memoryAdmin, ...profilePayload };
    await writeJsonFile("admin", memoryAdmin);
    return response.json(toClientAdmin(memoryAdmin));
  }

  const admin = await mongoose.model("User").findOneAndUpdate(
    { email: request.admin.email },
    profilePayload,
    { new: true, runValidators: true }
  );
  if (!admin) return response.status(404).json({ message: "Admin profile not found." });
  return response.json(toClientAdmin(admin));
});

app.get("/api/theme", async (request, response) => {
  response.json(await getThemeConfig());
});

app.put("/api/admin/theme", requireAdmin, async (request, response) => {
  const themeConfig = normalizeThemeConfig(request.body.themeConfig);

  if (!mongoConnected) {
    memoryTheme = { name: "default", themeConfig };
    await writeJsonFile("theme", memoryTheme.themeConfig);
    return response.json(memoryTheme.themeConfig);
  }

  const theme = await Theme.findOneAndUpdate(
    { name: "default" },
    { themeConfig },
    { new: true, upsert: true }
  );
  return response.json(theme.themeConfig);
});

app.get("/api/products", async (request, response) => {
  if (!mongoConnected) {
    return response.json(memoryProducts.filter((product) => product.isActive).map(toClientProduct));
  }

  const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
  return response.json(products.map(toClientProduct));
});

app.get("/api/admin/products", requireAdmin, async (request, response) => {
  if (!mongoConnected) {
    return response.json(memoryProducts.map(toClientProduct));
  }

  const products = await Product.find().sort({ createdAt: -1 });
  return response.json(products.map(toClientProduct));
});

app.post("/api/admin/products", requireAdmin, async (request, response) => {
  const { category, description, discountMoney, image, isActive, name, price, tag } = request.body;
  const tags = normalizeTags(request.body.tags || tag || category);

  if (!name || !image || Number(price) <= 0) {
    return response.status(400).json({ message: "Product name, image, and price are required." });
  }

  const productPayload = {
    category: category || tags[0] || "Premium Collection",
    description: description || "Premium curated product.",
    discountMoney: Number(discountMoney || 0),
    image,
    isActive: isActive !== false,
    name,
    price: Number(price),
    tag: tag || tags[0] || "New Arrival",
    tags
  };

  if (!mongoConnected) {
    const product = { ...productPayload, id: Date.now(), createdAt: new Date().toISOString() };
    memoryProducts.unshift(product);
    await writeJsonFile("products", memoryProducts);
    return response.status(201).json(toClientProduct(product));
  }

  const product = await Product.create(productPayload);
  return response.status(201).json(toClientProduct(product));
});

app.put("/api/admin/products/:id", requireAdmin, async (request, response) => {
  const { category, description, discountMoney, image, isActive, name, price, tag } = request.body;
  const tags = normalizeTags(request.body.tags || tag || category);

  if (!name || !image || Number(price) <= 0) {
    return response.status(400).json({ message: "Product name, image, and price are required." });
  }

  const productPayload = {
    category: category || tags[0] || "Premium Collection",
    description: description || "Premium curated product.",
    discountMoney: Number(discountMoney || 0),
    image,
    isActive: isActive !== false,
    name,
    price: Number(price),
    tag: tag || tags[0] || "New Arrival",
    tags
  };

  if (!mongoConnected) {
    const productIndex = memoryProducts.findIndex((product) => String(product.id) === request.params.id);
    if (productIndex === -1) return response.status(404).json({ message: "Product not found." });
    memoryProducts[productIndex] = { ...memoryProducts[productIndex], ...productPayload };
    await writeJsonFile("products", memoryProducts);
    return response.json(toClientProduct(memoryProducts[productIndex]));
  }

  const product = await Product.findByIdAndUpdate(request.params.id, productPayload, {
    new: true,
    runValidators: true
  });
  if (!product) return response.status(404).json({ message: "Product not found." });
  return response.json(toClientProduct(product));
});

app.delete("/api/admin/products/:id", requireAdmin, async (request, response) => {
  if (!mongoConnected) {
    const productIndex = memoryProducts.findIndex((product) => String(product.id) === request.params.id);
    if (productIndex === -1) return response.status(404).json({ message: "Product not found." });
    const [deletedProduct] = memoryProducts.splice(productIndex, 1);
    memoryCollections = memoryCollections.map((collection) => ({
      ...collection,
      productIds: (collection.productIds || []).filter((id) => String(id) !== request.params.id)
    }));
    await Promise.all([writeJsonFile("products", memoryProducts), writeJsonFile("collections", memoryCollections)]);
    return response.json(toClientProduct(deletedProduct));
  }

  const deletedProduct = await Product.findByIdAndDelete(request.params.id);
  if (!deletedProduct) return response.status(404).json({ message: "Product not found." });
  await Collection.updateMany({}, { $pull: { productIds: request.params.id, products: request.params.id } });
  return response.json(toClientProduct(deletedProduct));
});

app.get("/api/collections", async (request, response) => {
  if (!mongoConnected) {
    return response.json(memoryCollections);
  }

  const collections = await Collection.find().sort({ title: 1 });
  return response.json(collections.map(toClientCollection));
});

app.post("/api/admin/collections", requireAdmin, async (request, response) => {
  const title = String(request.body.title || "").trim();
  const matchTag = String(request.body.matchTag || title).trim();

  if (!title) {
    return response.status(400).json({ message: "Collection title is required." });
  }

  const productIds = normalizeProductIds(request.body.productIds);
  const conflictingCollection = await findProductAssignmentConflict(productIds);
  if (conflictingCollection) {
    return response.status(409).json({
      message: `One or more selected products already belong to "${conflictingCollection.title}". Remove them there before adding here.`
    });
  }

  const collectionPayload = {
    description: request.body.description || "",
    handle: "",
    image: request.body.image || "",
    matchTag,
    productIds,
    products: productIds.filter((id) => mongoose.Types.ObjectId.isValid(id)),
    title
  };

  if (!mongoConnected) {
    collectionPayload.handle = makeUniqueMemoryHandle(request.body.handle || title);
    const collection = { ...collectionPayload, id: Date.now() };
    memoryCollections.unshift(collection);
    await writeJsonFile("collections", memoryCollections);
    return response.status(201).json(collection);
  }

  collectionPayload.handle = await makeUniqueMongoHandle(request.body.handle || title);
  try {
    const collection = await Collection.create(collectionPayload);
    return response.status(201).json(toClientCollection(collection));
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: "A collection with this title or URL already exists." });
    }
    return response.status(500).json({ message: "Failed to create collection." });
  }
});

app.put("/api/admin/collections/:id", requireAdmin, async (request, response) => {
  const title = String(request.body.title || "").trim();
  const matchTag = String(request.body.matchTag || title).trim();

  if (!title) {
    return response.status(400).json({ message: "Collection title is required." });
  }

  const productIds = normalizeProductIds(request.body.productIds);
  const conflictingCollection = await findProductAssignmentConflict(productIds, request.params.id);
  if (conflictingCollection) {
    return response.status(409).json({
      message: `One or more selected products already belong to "${conflictingCollection.title}". Remove them there before adding here.`
    });
  }

  const collectionPayload = {
    description: request.body.description || "",
    handle: "",
    image: request.body.image || "",
    matchTag,
    productIds,
    products: productIds.filter((id) => mongoose.Types.ObjectId.isValid(id)),
    title
  };

  if (!mongoConnected) {
    const collectionIndex = memoryCollections.findIndex((collection) => String(collection.id) === request.params.id);
    if (collectionIndex === -1) return response.status(404).json({ message: "Collection not found." });
    collectionPayload.handle = makeUniqueMemoryHandle(request.body.handle || title, request.params.id);
    memoryCollections[collectionIndex] = {
      ...memoryCollections[collectionIndex],
      ...collectionPayload
    };
    await writeJsonFile("collections", memoryCollections);
    return response.json(memoryCollections[collectionIndex]);
  }

  collectionPayload.handle = await makeUniqueMongoHandle(request.body.handle || title, request.params.id);
  try {
    const collection = await Collection.findByIdAndUpdate(request.params.id, collectionPayload, {
      new: true,
      runValidators: true
    });
    if (!collection) return response.status(404).json({ message: "Collection not found." });
    return response.json(toClientCollection(collection));
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: "A collection with this title or URL already exists." });
    }
    return response.status(500).json({ message: "Failed to update collection." });
  }
});

app.delete("/api/admin/collections/:id", requireAdmin, async (request, response) => {
  if (!mongoConnected) {
    const collectionIndex = memoryCollections.findIndex((collection) => String(collection.id) === request.params.id);
    if (collectionIndex === -1) return response.status(404).json({ message: "Collection not found." });
    const [deletedCollection] = memoryCollections.splice(collectionIndex, 1);
    await writeJsonFile("collections", memoryCollections);
    return response.json(deletedCollection);
  }

  const deletedCollection = await Collection.findByIdAndDelete(request.params.id);
  if (!deletedCollection) return response.status(404).json({ message: "Collection not found." });
  return response.json(toClientCollection(deletedCollection));
});

app.post("/api/admin/recovery/import", requireAdmin, async (request, response) => {
  return response.status(410).json({
    message: "Browser/JSON recovery is disabled in the app. Use npm run migrate:json-to-mongo from the server folder."
  });

  const extracted = extractRecoveryData(request.body || {});

  if (!mongoConnected) {
    const productMerge = mergeProducts(memoryProducts, extracted.products);
    memoryProducts = productMerge.products;

    const collectionMerge = mergeCollections(memoryCollections, extracted.collections, extracted.products.map(normalizeProductInput));
    memoryCollections = collectionMerge.collections;

    const orderMerge = mergeOrders(orders, extracted.orders);
    orders = orderMerge.orders;

    if (extracted.theme && typeof extracted.theme === "object" && !Array.isArray(extracted.theme)) {
      memoryTheme = {
        name: "default",
        themeConfig: { ...memoryTheme.themeConfig, ...extracted.theme }
      };
    }

    if (extracted.admin && typeof extracted.admin === "object") {
      memoryAdmin = {
        ...memoryAdmin,
        email: extracted.admin.email || memoryAdmin.email,
        name: extracted.admin.name || memoryAdmin.name,
        profileImage: extracted.admin.profileImage || memoryAdmin.profileImage,
        role: "admin"
      };
    }

    await persistMemoryStore();

    return response.json({
      dataDir: getDataDir(),
      sourceKeys: extracted.sourceKeys,
      recovered: {
        admin: extracted.admin ? 1 : 0,
        collections: collectionMerge.recoveredCount,
        orders: orderMerge.recoveredCount,
        products: productMerge.recoveredCount,
        theme: extracted.theme ? 1 : 0
      },
      totals: {
        collections: memoryCollections.length,
        orders: orders.length,
        products: memoryProducts.length
      }
    });
  }

  const validProducts = extracted.products.map(normalizeProductInput).filter((product) => product.name && product.image && Number(product.price) > 0);
  let recoveredProducts = 0;
  for (const product of validProducts) {
    const existing = await Product.findOne({ name: product.name });
    if (existing) {
      await Product.findByIdAndUpdate(existing._id, {
        category: product.category,
        description: product.description,
        discountMoney: product.discountMoney,
        image: product.image,
        isActive: product.isActive,
        price: product.price,
        tag: product.tag,
        tags: product.tags
      });
    } else {
      await Product.create(product);
      recoveredProducts += 1;
    }
  }

  const validCollections = extracted.collections.map(normalizeCollectionInput).filter((collection) => collection.title);
  let recoveredCollections = 0;
  for (const collection of validCollections) {
    const existing = await Collection.findOne({ $or: [{ title: collection.title }, { handle: collection.handle }] });
    if (existing) {
      await Collection.findByIdAndUpdate(existing._id, {
        ...collection,
        productIds: [...new Set([...(existing.productIds || []), ...(collection.productIds || [])].map(String))]
      });
    } else {
      await Collection.create(collection);
      recoveredCollections += 1;
    }
  }

  if (extracted.theme) {
    await Theme.findOneAndUpdate({ name: "default" }, { themeConfig: { ...defaultTheme, ...extracted.theme } }, { new: true, upsert: true });
  }

  return response.json({
    dataDir: "MongoDB",
    sourceKeys: extracted.sourceKeys,
    recovered: {
      admin: 0,
      collections: recoveredCollections,
      orders: 0,
      products: recoveredProducts,
      theme: extracted.theme ? 1 : 0
    },
    totals: {
      collections: await Collection.countDocuments(),
      orders: orders.length,
      products: await Product.countDocuments()
    }
  });
});

app.get("/api/collections/:handle/products", async (request, response) => {
  if (!mongoConnected) {
    const collection = memoryCollections.find((item) => item.handle === request.params.handle);
    if (!collection) return response.status(404).json({ message: "Collection not found." });
    return response.json(memoryProducts.filter((product) => product.isActive).filter(collectionProductMatcher(collection)).map(toClientProduct));
  }

  const collection = await Collection.findOne({ handle: request.params.handle });
  if (!collection) return response.status(404).json({ message: "Collection not found." });

  const manualIds = (collection.productIds || []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  const products = await Product.find({ isActive: true, _id: { $in: manualIds } }).sort({ createdAt: -1 });
  return response.json(products.map(toClientProduct));
});

app.post("/api/orders", async (request, response) => {
  const { customer, items } = request.body;

  if (!customer?.name || !customer?.phone || !customer?.address || !Array.isArray(items) || !items.length) {
    return response.status(400).json({ message: "Customer details and cart items are required." });
  }

  const normalizedItems = items.map((item) => ({
    image: item.image || "",
    name: String(item.name || "").trim(),
    price: Number(item.price || 0),
    productId: String(item.id || item._id || item.productId || ""),
    quantity: Number(item.quantity || 1)
  })).filter((item) => item.name && item.quantity > 0);

  if (!normalizedItems.length) {
    return response.status(400).json({ message: "At least one valid order item is required." });
  }

  const total = normalizedItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const orderPayload = {
    orderId: `MB-${Date.now()}`,
    address: String(customer.address || "").trim(),
    customer: {
      address: String(customer.address || "").trim(),
      name: String(customer.name || "").trim(),
      note: String(customer.note || "").trim(),
      phone: String(customer.phone || "").trim()
    },
    customerName: String(customer.name || "").trim(),
    items: normalizedItems,
    phone: String(customer.phone || "").trim(),
    status: "Pending",
    total,
    createdAt: new Date().toISOString()
  };

  if (!mongoConnected) {
    const order = orderPayload;
    orders.push(order);
    await writeJsonFile("orders", orders);
    return response.status(201).json(order);
  }

  const order = await Order.create(orderPayload);
  return response.status(201).json(await toClientOrder(order));
});

app.get("/api/admin/orders", requireAdmin, async (request, response) => {
  if (!mongoConnected) {
    return response.json(orders.map((order) => ({ ...order, status: order.status || "Pending" })));
  }

  const savedOrders = await Order.find().sort({ createdAt: -1 });
  return response.json(await Promise.all(savedOrders.map(toClientOrder)));
});

app.patch("/api/admin/orders/:id/status", requireAdmin, async (request, response) => {
  const status = String(request.body.status || "").trim();
  const allowedStatuses = ["Pending", "Confirmed", "Packed", "Delivered", "Cancelled"];
  if (!allowedStatuses.includes(status)) {
    return response.status(400).json({ message: "Invalid order status." });
  }

  if (!mongoConnected) {
    const index = orders.findIndex((order) => String(order.orderId || order.id) === String(request.params.id));
    if (index === -1) return response.status(404).json({ message: "Order not found." });
    orders[index] = { ...orders[index], status, updatedAt: new Date().toISOString() };
    await writeJsonFile("orders", orders);
    return response.json(orders[index]);
  }

  const orderQuery = mongoose.Types.ObjectId.isValid(request.params.id)
    ? { $or: [{ _id: request.params.id }, { orderId: request.params.id }] }
    : { orderId: request.params.id };
  const order = await Order.findOneAndUpdate(orderQuery, { status }, { new: true, runValidators: true });
  if (!order) return response.status(404).json({ message: "Order not found." });
  return response.json(await toClientOrder(order));
});

start();
