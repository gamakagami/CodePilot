import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const message =
    err instanceof Error
      ? err.message
      : "Unknown error";

  console.error("Gateway Error:", message);

  res.status(500).json({
    error: "Internal Gateway Error",
  });
}
