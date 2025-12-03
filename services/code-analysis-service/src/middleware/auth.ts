import { Request, Response, NextFunction } from "express";

export default function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  // JWT verification would go here
  next();
}
