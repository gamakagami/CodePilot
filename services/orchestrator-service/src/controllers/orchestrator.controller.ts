import { Request, Response } from "express";
import { orchestratorService } from "../services/orchestrator.service";

export const orchestratorController = {
  async analyzePR(req: Request & { user?: any }, res: Response) {
    try {
      const { 
        code, 
        repoContext,
        fileId, 
        developer,
        linesAdded,
        linesDeleted,
        filesChanged,
        codeCoverageChange,
        buildDuration,
        previousFailureRate,
        repositoryFullName,
        prId,
        prUrl
      } = req.body;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: 'code'"
        });
      }
      
      // Get userId from authenticated user (from JWT token)
      const userId = req.user.userId || req.user.id;
      
      const result = await orchestratorService.analyzePR(
        {
          code,
          repoContext: repoContext || [],
          repositoryFullName: repositoryFullName,
          fileId: fileId || `file_${Date.now()}`,
          developer: developer || req.user.email || "unknown",
          linesAdded: linesAdded || 0,
          linesDeleted: linesDeleted || 0,
          filesChanged: filesChanged || 1,
          codeCoverageChange: codeCoverageChange || 0,
          buildDuration: buildDuration || 0,
          previousFailureRate: previousFailureRate || 0.1
        },
        userId,
        repositoryFullName,
        prId,
        prUrl
      );
      
      res.json(result);
      
    } catch (error: any) {
      console.error("Orchestrator error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze PR"
      });
    }
  },
  
  async getAnalysisHistory(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user.userId || req.user.id;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const history = await orchestratorService.getAnalysisHistory(userId, limit);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      console.error("Error fetching history:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  async getRepositoryAnalyses(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user.userId || req.user.id;
      const { repositoryFullName } = req.params;
      
      const analyses = await orchestratorService.getRepositoryAnalyses(
        decodeURIComponent(repositoryFullName),
        userId
      );
      
      res.json({
        success: true,
        data: { analyses }
      });
    } catch (error: any) {
      console.error("Error fetching repository analyses:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  async getMetricsHistory(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user.userId || req.user.id;
      const period = req.query.period || "6months";
      
      const periodMonths = period === "6months" ? 6 : period === "1year" ? 12 : 6;
      const metrics = await orchestratorService.getMetricsHistory(userId, periodMonths);
      
      res.json({
        success: true,
        data: { metrics }
      });
    } catch (error: any) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  async getBaselineMetrics(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user.userId || req.user.id;
      
      const baseline = await orchestratorService.getBaselineMetrics(userId);
      
      res.json({
        success: true,
        data: baseline
      });
    } catch (error: any) {
      console.error("Error fetching baseline:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};
