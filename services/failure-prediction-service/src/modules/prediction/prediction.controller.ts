import { Request, Response } from "express";
import { predictionService } from "./prediction.service";

export const predictionController = {
  async predict(req: Request, res: Response) {
    const result = await predictionService.predictFailure(req.body);
    res.json(result);
  }
};
