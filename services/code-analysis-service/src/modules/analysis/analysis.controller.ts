import { Request, Response } from "express";
import analysisService from "./analysis.service";

class AnalysisController {
  analyze = async (req: Request, res: Response) => {
    try {
      const { 
        code, 
        fileId,
        developer,
        linesAdded,
        linesDeleted,
        filesChanged,
        codeCoverageChange,
        buildDuration,
        previousFailureRate
      } = req.body;

      if (!code) {
        return res.status(400).json({ 
          error: "Missing 'code' in request body" 
        });
      }

      const result = await analysisService.analyze({
        code,
        fileId,
        developer,
        linesAdded,
        linesDeleted,
        filesChanged,
        codeCoverageChange,
        buildDuration,
        previousFailureRate
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Analysis failed"
      });
    }
  };
}

export default new AnalysisController();