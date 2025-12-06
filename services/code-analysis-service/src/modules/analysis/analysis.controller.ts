import { Request, Response } from "express";
import analysisService from "./analysis.service";

class AnalysisController {
  analyze = async (req: Request, res: Response) => {
    try {
      const { code, fileId } = req.body;

      if (!code) {
        return res.status(400).json({ 
          error: "Missing 'code' in request body" 
        });
      }

      // Use provided fileId or generate one
      const id = fileId || `file_${Date.now()}`;

      const result = await analysisService.analyze(code, id);
      
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