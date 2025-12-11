import { Request, Response } from "express";
import { Feedback } from "../models/feedback.model";
import { analyticsTrackerService } from "../services/analytics-tracker.service";

export const feedbackController = {
  async submitFeedback(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user.userId || req.user.id;
      const { analysisId, rating, comment } = req.body;
      
      if (!analysisId || !rating) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: analysisId, rating"
        });
      }
      
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: "Rating must be between 1 and 5"
        });
      }
      
      const feedback = new Feedback({
        userId,
        analysisId,
        rating,
        comment,
        timestamp: new Date()
      });
      
      await feedback.save();
      
      // Update analytics with new feedback
      await analyticsTrackerService.updateFeedbackQuality(userId, rating);
      
      res.json({
        success: true,
        data: feedback
      });
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  async getFeedback(req: Request & { user?: any }, res: Response) {
    try {
      const userId = req.user.userId || req.user.id;
      const period = req.query.period || "6months";
      
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - (period === "6months" ? 6 : 12));
      
      const feedback = await Feedback.find({
        userId,
        timestamp: { $gte: startDate }
      })
        .sort({ timestamp: -1 })
        .lean();
      
      res.json({
        success: true,
        data: { feedback }
      });
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};