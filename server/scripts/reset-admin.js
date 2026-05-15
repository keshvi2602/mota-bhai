import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "../src/models/User.js";
import { configureMongoDns, getMongoUri, getMongoUriError } from "../src/utils/mongoUri.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(serverDir, "..");

dotenv.config({ path: path.join(repoDir, ".env") });
dotenv.config({ path: path.join(serverDir, ".env"), override: true });

const mongoUri = getMongoUri();
const adminEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const adminPassword = String(process.env.ADMIN_PASSWORD || "");
const mongoUriError = getMongoUriError(mongoUri);

if (mongoUriError) {
  console.error(mongoUriError);
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error("ADMIN_EMAIL or ADMIN_PASSWORD missing in .env.");
  process.exit(1);
}

try {
  configureMongoDns(mongoUri);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        email: adminEmail,
        isAdmin: true,
        name: "Mota Bhai Admin",
        passwordHash,
        role: "admin"
      },
      $setOnInsert: {
        profileImage: ""
      }
    },
    { new: true, runValidators: true, upsert: true }
  );

  console.log("Admin reset/upsert successful.");
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Email: ${admin.email}`);
  console.log("Password: loaded from .env, not printed.");
} catch (error) {
  console.error("Admin reset failed.");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.connection.close(true);
}
