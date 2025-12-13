import { Request, Response, NextFunction } from "express";

export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("Error:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal server error"
  });
}
