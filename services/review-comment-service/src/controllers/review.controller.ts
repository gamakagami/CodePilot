import { Request, Response } from "express";
import { reviewService } from "../services/review.service";

export const reviewController = {
  async generateReview(req: Request, res: Response) {
    try {
      const { code, language } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      const result = await reviewService.generateReviewComments({ code, language });

      res.json({ review: result });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate review comments" });
    }
  }
};
