import jwt from "jsonwebtoken";

export function requireAdmin(request, response, next) {
  const authHeader = request.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return response.status(401).json({ message: "Admin token required." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-only-change-this-secret");
    if (payload.role !== "admin") {
      return response.status(403).json({ message: "Admin access required." });
    }
    request.admin = payload;
    return next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired admin token." });
  }
}
