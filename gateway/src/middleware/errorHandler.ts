import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("Gateway error:", err);
  res.status(500).json({ error: "Internal gateway error" });
}
