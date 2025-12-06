import { Request, Response } from "express";
import { orchestratorService } from "../services/orchestrator.service";

export const orchestratorController = {
  async analyzePR(req: Request, res: Response) {
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
          success: false,
          error: "Missing required field: 'code'"
        });
      }
      
      const result = await orchestratorService.analyzePR({
        code,
        fileId: fileId || `file_${Date.now()}`,
        developer: developer || "unknown",
        linesAdded: linesAdded || 0,
        linesDeleted: linesDeleted || 0,
        filesChanged: filesChanged || 1,
        codeCoverageChange: codeCoverageChange || 0,
        buildDuration: buildDuration || 0,
        previousFailureRate: previousFailureRate || 0.1
      });
      
      res.json(result);
      
    } catch (error: any) {
      console.error("Orchestrator error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze PR"
      });
    }
  }
};