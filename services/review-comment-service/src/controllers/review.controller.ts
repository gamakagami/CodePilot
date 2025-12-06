import { Request, Response } from "express";
import { reviewService } from "../services/review.service";

export const reviewController = {
  async generateReview(req: Request, res: Response) {
    try {
      const { analysis, prediction } = req.body;

      // Validate required fields
      if (!analysis || !prediction) {
        return res.status(400).json({ 
          success: false,
          error: "Missing required fields: 'analysis' and 'prediction' are required" 
        });
      }

      // Validate analysis structure
      if (!analysis.metrics || !analysis.mernPatterns) {
        return res.status(400).json({
          success: false,
          error: "Invalid analysis structure"
        });
      }

      const review = await reviewService.generateReview({
        analysis,
        prediction
      });

      res.json({
        success: true,
        data: review
      });

    } catch (error: any) {
      console.error("Review generation error:", error);
      res.status(500).json({ 
        success: false,
        error: error.message || "Failed to generate review" 
      });
    }
  }
};