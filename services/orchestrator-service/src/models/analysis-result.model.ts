import mongoose, { Schema, Document } from "mongoose";

export interface IAnalysisResult extends Document {
  userId: string;
  fileId: string;
  repositoryFullName: string;
  prId?: number;
  prUrl?: string;
  timestamp: Date;
  
  // Analysis data
  metrics: {
    linesOfCode: number;
    cyclomaticComplexity: number;
    maintainabilityIndex: number;
    linesAdded: number;
    linesDeleted: number;
    filesChanged: number;
  };
  
  // Prediction data
  prediction: {
    predicted_failure: number;
    failure_probability: number;
    will_fail: boolean;
    confidence: string;
    recommendation: string;
  };
  
  // Review data
  review: {
    summary: string;
    riskLevel: string;
    shouldMerge: boolean;
    issues: any[];
    recommendations: string[];
    codeQuality: any;
  };
  
  // Overall assessment
  overall: {
    canMerge: boolean;
    requiresReview: boolean;
    criticalIssuesCount: number;
  };
  
  // Additional metadata
  developer?: string;
  buildDuration?: number;
  codeCoverageChange?: number;
  previousFailureRate?: number;
}

const AnalysisResultSchema = new Schema({
  userId: { type: String, required: true, index: true },
  fileId: { type: String, required: true },
  repositoryFullName: { type: String, index: true },
  prId: { type: Number },
  prUrl: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
  
  metrics: {
    linesOfCode: Number,
    cyclomaticComplexity: Number,
    maintainabilityIndex: Number,
    linesAdded: Number,
    linesDeleted: Number,
    filesChanged: Number
  },
  
  prediction: {
    predicted_failure: Number,
    failure_probability: Number,
    will_fail: Boolean,
    confidence: String,
    recommendation: String
  },
  
  review: {
    summary: String,
    riskLevel: String,
    shouldMerge: Boolean,
    issues: [Schema.Types.Mixed],
    recommendations: [String],
    codeQuality: Schema.Types.Mixed
  },
  
  overall: {
    canMerge: Boolean,
    requiresReview: Boolean,
    criticalIssuesCount: Number
  },
  
  developer: String,
  buildDuration: Number,
  codeCoverageChange: Number,
  previousFailureRate: Number
});

// Indexes for efficient querying
AnalysisResultSchema.index({ userId: 1, timestamp: -1 });
AnalysisResultSchema.index({ repositoryFullName: 1, timestamp: -1 });

export const AnalysisResult = mongoose.model<IAnalysisResult>("AnalysisResult", AnalysisResultSchema);