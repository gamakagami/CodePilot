import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export default function requireAuth(
  req: Request & { user?: any },
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Invalid Authorization header" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    console.log("JWT Verified:", decoded);
    req.user = decoded;
    next();
  } catch (err: any) {
    console.error("JWT Verification Failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
