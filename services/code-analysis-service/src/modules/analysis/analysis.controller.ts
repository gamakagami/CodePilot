import { Request, Response } from "express";
import analysisService from "./analysis.service";

class AnalysisController {
  analyze = async (req: Request, res: Response) => {
    const { code } = req.body;
    const result = await analysisService.analyze(code);
    res.json(result);
  };
}

export default new AnalysisController();
