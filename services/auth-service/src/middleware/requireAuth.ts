import jwt from "jsonwebtoken";
import { loadEnv } from "../utils/env";
import { Request, Response, NextFunction } from "express";

const env = loadEnv();

export default function requireAuth(
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
