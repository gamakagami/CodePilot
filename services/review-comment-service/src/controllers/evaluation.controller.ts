// controllers/evaluation.controller.ts
import { Request, Response } from "express";
import { evaluationService } from "../services/evaluation.service";

export const evaluationController = {
  async evaluate(req: Request, res: Response) {
    try {
      const { generatedReview, referenceText } = req.body;
      const result = await evaluationService.evaluateReview(generatedReview, referenceText);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};