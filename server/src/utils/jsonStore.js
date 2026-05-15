import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../../data");

const files = {
  admin: "admin.json",
  collections: "collections.json",
  orders: "orders.json",
  products: "products.json",
  theme: "theme.json"
};

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

export function getDataDir() {
  return dataDir;
}

export async function readJsonFile(name, fallback) {
  await ensureDataDir();
  const filePath = path.join(dataDir, files[name]);
  try {
    const content = await fs.readFile(filePath, "utf8");
    if (!content.trim()) return fallback;
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeJsonFile(name, fallback);
      return fallback;
    }
    console.warn(`Could not read ${filePath}: ${error.message}`);
    return fallback;
  }
}

export async function writeJsonFile(name, data) {
  await ensureDataDir();
  const filePath = path.join(dataDir, files[name]);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return data;
}
