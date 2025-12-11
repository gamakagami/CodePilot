import { Request, Response } from "express";
import { analyticsTrackerService } from "../services/analytics-tracker.service";

export const analyticsController = {
  async getUserAnalytics(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user.userId || req.user.id;
      
      const analytics = await analyticsTrackerService.getUserAnalytics(userId);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  async recalculateAnalytics(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user.userId || req.user.id;
      
      await analyticsTrackerService.recalculateUserAnalytics(userId);
      
      const analytics = await analyticsTrackerService.getUserAnalytics(userId);
      
      res.json({
        success: true,
        message: "Analytics recalculated successfully",
        data: analytics
      });
    } catch (error: any) {
      console.error("Error recalculating analytics:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};