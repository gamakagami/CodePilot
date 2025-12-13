import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export default function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;

  // No Authorization header at all
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Wrong format
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}
