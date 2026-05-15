import dns from "node:dns";

const PASSWORD_PLACEHOLDER_PATTERN = /<\s*(db_)?password\s*>/i;

export function getMongoUri() {
  return String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
}

export function configureMongoDns(uri) {
  if (!String(uri || "").startsWith("mongodb+srv://")) return [];

  const servers = String(process.env.MONGO_DNS_SERVERS || "")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (!servers.length) return [];

  dns.setServers(servers);
  return servers;
}

export function hasMongoPasswordPlaceholder(uri) {
  return PASSWORD_PLACEHOLDER_PATTERN.test(String(uri || ""));
}

export function getMongoUriError(uri) {
  if (!uri) {
    return "MONGO_URI or MONGODB_URI is missing in .env.";
  }

  if (hasMongoPasswordPlaceholder(uri)) {
    return "MongoDB Atlas URI still contains <db_password>. Replace it with the real database user's password in .env.";
  }

  return "";
}
