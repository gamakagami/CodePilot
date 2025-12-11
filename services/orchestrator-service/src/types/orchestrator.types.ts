export interface AnalyzePRRequest {
  code: string;
  fileId?: string;
  developer?: string;
  linesAdded?: number;
  linesDeleted?: number;
  filesChanged?: number;
  codeCoverageChange?: number;
  buildDuration?: number;
  previousFailureRate?: number;
}

export interface OrchestratorResponse {
  success: boolean;
  data?: {
    fileId: string;
    timestamp: string;
    
    analysis: {
      metrics: any;
      mernPatterns: any;
      dependencies: any;
      warnings: string[];
    };
    
    prediction: {
      predicted_failure: number;
      failure_probability: number;
      will_fail: boolean;
      confidence: string;
      recommendation: string;
    };
    
    review: {
      summary: string;
      riskLevel: string;
      shouldMerge: boolean;
      issues: any[];
      recommendations: string[];
      codeQuality: any;
    };
    
    overall: {
      canMerge: boolean;
      requiresReview: boolean;
      criticalIssuesCount: number;
    };
    
    // Performance metrics in seconds
    performance: {
      totalDuration: number;        // Total time for entire pipeline (seconds)
      analysisDuration: number;      // Time for analysis step (seconds)
      predictionDuration: number;    // Time for prediction step (seconds)
      reviewDuration: number;        // Time for review step (seconds)
      averageDuration: number;       // Average of all steps (seconds)
    };
  };
  error?: string;
}