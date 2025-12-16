import { UserAnalytics } from "../models/user-analytics.model";
import { AnalysisResult } from "../models/analysis-result.model";
import { Feedback } from "../models/feedback.model";

export class AnalyticsTrackerService {
  
  /**
   * Update user analytics after a PR analysis is completed
   */
  async updateAfterAnalysis(
    userId: string,
    repositoryFullName: string,
    totalDuration: number,
    predictionWasCorrect?: boolean
  ) {
    try {
      let analytics = await UserAnalytics.findOne({ userId });
      
      if (!analytics) {
        analytics = new UserAnalytics({ userId });
      }
      
      // Update CI Latency (running average)
      const newTotal = analytics.totalAnalysisSteps + 1;
      const currentSum = analytics.averageCILatency * analytics.totalAnalysisSteps;
      analytics.averageCILatency = parseFloat(
        ((currentSum + totalDuration) / newTotal).toFixed(2)
      );
      analytics.totalAnalysisSteps = newTotal;
      
      // Update model accuracy if we know the result
      if (predictionWasCorrect !== undefined) {
        if (predictionWasCorrect) {
          analytics.correctPredictions += 1;
        }
        analytics.totalPredictions += 1;
        analytics.modelAccuracy = parseFloat(
          ((analytics.correctPredictions / analytics.totalPredictions) * 100).toFixed(2)
        );
      }
      
      // Update active repositories
      if (!analytics.repositoryList.includes(repositoryFullName)) {
        analytics.repositoryList.push(repositoryFullName);
        analytics.activeRepositories = analytics.repositoryList.length;
      }
      
      // Increment total PRs analyzed
      analytics.totalPRsAnalyzed += 1;
      
      // Update timestamp
      analytics.lastUpdated = new Date();
      
      await analytics.save();
      
      console.log(`Analytics updated for user ${userId}`);
    } catch (error) {
      console.error("Failed to update analytics:", error);
    }
  }
  
  /**
   * Update LLM feedback quality after user submits feedback
   */
  async updateFeedbackQuality(userId: string, rating: number) {
    try {
      let analytics = await UserAnalytics.findOne({ userId });
      
      if (!analytics) {
        analytics = new UserAnalytics({ userId });
      }
      
      // Update feedback quality (running average)
      analytics.feedbackSum += rating;
      analytics.totalFeedbacks += 1;
      analytics.llmFeedbackQuality = parseFloat(
        (analytics.feedbackSum / analytics.totalFeedbacks).toFixed(2)
      );
      
      // Update timestamp
      analytics.lastUpdated = new Date();
      
      await analytics.save();
      
      console.log(`Feedback quality updated for user ${userId}`);
    } catch (error) {
      console.error("Failed to update feedback quality:", error);
    }
  }
  
  /**
   * Recalculate all analytics for a user from scratch
   */
  async recalculateUserAnalytics(userId: string) {
    try {
      // Get all analysis results
      const analyses = await AnalysisResult.find({ userId }).lean();
      
      // Get all feedbacks
      const feedbacks = await Feedback.find({ userId }).lean();
      
      // Calculate CI Latency
      const validDurations = analyses
        .map(a => a.buildDuration || 0)
        .filter(d => d > 0);
      
      const averageCILatency = validDurations.length > 0
        ? parseFloat((validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length).toFixed(2))
        : 0;
      
      // Calculate Model Accuracy
      const totalPredictions = analyses.length;
      const correctPredictions = analyses.filter(a => {
        const confidence = a.prediction?.confidence?.toLowerCase();
        return confidence === 'high';
      }).length;
      
      const modelAccuracy = totalPredictions > 0
        ? parseFloat(((correctPredictions / totalPredictions) * 100).toFixed(2))
        : 0;
      
      // Get unique repositories
      const repositoryList = [...new Set(analyses.map(a => a.repositoryFullName))];
      const activeRepositories = repositoryList.length;
      
      // Total PRs analyzed
      const totalPRsAnalyzed = analyses.length;
      
      // LLM Feedback Quality
      const feedbackSum = feedbacks.reduce((sum, f) => sum + f.rating, 0);
      const totalFeedbacks = feedbacks.length;
      const llmFeedbackQuality = totalFeedbacks > 0
        ? parseFloat((feedbackSum / totalFeedbacks).toFixed(2))
        : 0;
      
      // Update or create analytics
      await UserAnalytics.findOneAndUpdate(
        { userId },
        {
          userId,
          averageCILatency,
          totalAnalysisSteps: validDurations.length,
          modelAccuracy,
          totalPredictions,
          correctPredictions,
          activeRepositories,
          repositoryList,
          totalPRsAnalyzed,
          llmFeedbackQuality,
          totalFeedbacks,
          feedbackSum,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
      
      console.log(`Analytics recalculated for user ${userId}`);
    } catch (error) {
      console.error("Failed to recalculate analytics:", error);
      throw error;
    }
  }
  
  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string) {
    try {
      let analytics = await UserAnalytics.findOne({ userId }).lean();
      
      if (!analytics) {
        // Create default analytics if doesn't exist
        analytics = await UserAnalytics.create({ userId });
      }
      
      return {
        averageCILatency: analytics.averageCILatency,
        modelAccuracy: analytics.modelAccuracy,
        activeRepositories: analytics.activeRepositories,
        totalPRsAnalyzed: analytics.totalPRsAnalyzed,
        llmFeedbackQuality: analytics.llmFeedbackQuality,
        lastUpdated: analytics.lastUpdated
      };
    } catch (error) {
      console.error("Failed to get user analytics:", error);
      throw error;
    }
  }
  
  /**
   * Mark a prediction as correct/incorrect (for improving accuracy tracking)
   */
  async updatePredictionOutcome(userId: string, wasCorrect: boolean) {
    try {
      const analytics = await UserAnalytics.findOne({ userId });
      
      if (!analytics) return;
      
      if (wasCorrect) {
        analytics.correctPredictions += 1;
      }
      analytics.totalPredictions += 1;
      
      analytics.modelAccuracy = parseFloat(
        ((analytics.correctPredictions / analytics.totalPredictions) * 100).toFixed(2)
      );
      
      analytics.lastUpdated = new Date();
      await analytics.save();
      
      console.log(`Prediction outcome updated for user ${userId}`);
    } catch (error) {
      console.error("Failed to update prediction outcome:", error);
    }
  }
}

export const analyticsTrackerService = new AnalyticsTrackerService();