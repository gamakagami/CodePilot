import { Request, Response } from "express";
import { predictionService } from "./prediction.service";

export class PredictionController {
  async predict(req: Request, res: Response) {
    try {
      const result = await predictionService.predictFailure(req.body);
      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Prediction failed" });
    }
  }
}

export const predictionController = new PredictionController();
