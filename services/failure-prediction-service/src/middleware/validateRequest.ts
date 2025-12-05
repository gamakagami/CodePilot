import { Request, Response, NextFunction } from "express";

export function validateRequest(required: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of required) {
      if (req.body[field] === undefined) {
        return res.status(400).json({
          success: false,
          message: `Missing field: ${field}`,
        });
      }
    }
    next();
  };
}
