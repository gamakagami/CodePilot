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
  };
  error?: string;
}
