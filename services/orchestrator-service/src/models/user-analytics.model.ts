import mongoose, { Schema, Document } from "mongoose";

export interface IUserAnalytics extends Document {
  userId: string;
  
  // CI/CD Performance
  averageCILatency: number;           // Average duration of all analysis steps (seconds)
  totalAnalysisSteps: number;         // Total number of analysis steps completed
  
  // Model Performance
  modelAccuracy: number;              // Percentage of correct predictions (0-100)
  totalPredictions: number;           // Total predictions made
  correctPredictions: number;         // Number of correct predictions
  
  // Repository Tracking
  activeRepositories: number;         // Number of synced repositories
  repositoryList: string[];           // List of synced repository full names
  
  // PR Analysis
  totalPRsAnalyzed: number;          // Total PRs analyzed by this user
  
  // LLM Feedback Quality
  llmFeedbackQuality: number;         // Average rating 1-5 (can be decimal like 4.2)
  totalFeedbacks: number;             // Total number of feedbacks received
  feedbackSum: number;                // Sum of all ratings (for calculating average)
  
  // Timestamps
  lastUpdated: Date;
  createdAt: Date;
}

const UserAnalyticsSchema = new Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  
  // CI/CD Performance
  averageCILatency: { 
    type: Number, 
    default: 0,
    min: 0
  },
  totalAnalysisSteps: { 
    type: Number, 
    default: 0,
    min: 0
  },
  
  // Model Performance
  modelAccuracy: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 100
  },
  totalPredictions: { 
    type: Number, 
    default: 0,
    min: 0
  },
  correctPredictions: { 
    type: Number, 
    default: 0,
    min: 0
  },
  
  // Repository Tracking
  activeRepositories: { 
    type: Number, 
    default: 0,
    min: 0
  },
  repositoryList: [{ 
    type: String 
  }],
  
  // PR Analysis
  totalPRsAnalyzed: { 
    type: Number, 
    default: 0,
    min: 0
  },
  
  // LLM Feedback Quality
  llmFeedbackQuality: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5
  },
  totalFeedbacks: { 
    type: Number, 
    default: 0,
    min: 0
  },
  feedbackSum: { 
    type: Number, 
    default: 0,
    min: 0
  },
  
  // Timestamps
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for efficient queries
UserAnalyticsSchema.index({ userId: 1 });
UserAnalyticsSchema.index({ lastUpdated: -1 });

export const UserAnalytics = mongoose.model<IUserAnalytics>("UserAnalytics", UserAnalyticsSchema);