import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

export async function ensureAdminUser(isMongoConnected) {
  const email = (process.env.ADMIN_EMAIL || "admin@motabhai.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@12345";
  const passwordHash = await bcrypt.hash(password, 12);

  if (!isMongoConnected) {
    return {
      email,
      isAdmin: true,
      passwordHash,
      role: "admin",
      name: "Mota Bhai Admin",
      profileImage: "",
      otpHash: "",
      otpPurpose: "",
      otpExpiresAt: null,
      otpAttempts: 0,
      otpLastSentAt: null,
      otpPendingEmail: "",
      otpPendingPasswordHash: ""
    };
  }

  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) {
    if (process.env.ADMIN_PASSWORD) {
      const matchesEnvPassword = await bcrypt.compare(password, existingAdmin.passwordHash);
      if (!matchesEnvPassword) {
        existingAdmin.passwordHash = passwordHash;
      }
      existingAdmin.role = "admin";
      existingAdmin.isAdmin = true;
      await existingAdmin.save();
    }
    return existingAdmin;
  }

  return User.create({ email, isAdmin: true, passwordHash, role: "admin", name: "Mota Bhai Admin" });
}

export function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
