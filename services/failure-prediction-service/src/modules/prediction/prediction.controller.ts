import { Request, Response } from "express";
import { predictionService } from "./prediction.service";

export const predictionController = {
  async predict(req: Request, res: Response) {
    try {
      const result = await predictionService.predictFailure(req.body);

      res.json({
        success: true,
        data: {
          predicted_failure: result.predicted_failure,
          failure_probability: result.failure_probability,
          will_fail: result.predicted_failure === 1,
          confidence:
            result.failure_probability > 0.7
              ? "high"
              : result.failure_probability > 0.4
              ? "medium"
              : "low",
          // Pass the LLM rationale so downstream services can surface issues
          reasoning: result.reasoning,
          recommendation:
            result.predicted_failure === 1
              ? "High risk - Recommend additional review and testing"
              : "Low risk - Safe to proceed with standard review"
        }
      });
    } catch (error: any) {
      console.error("Prediction error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Prediction failed"
      });
    }
  },

  async getHistory(req: Request, res: Response) {
    try {
      const { developer } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const history = await predictionService.getHistory(developer, limit);

      res.json({
        success: true,
        data: {
          developer,
          total: history.length,
          predictions: history
        }
      });
    } catch (error: any) {
      console.error("History error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const stats = await predictionService.getStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error("Stats error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};
