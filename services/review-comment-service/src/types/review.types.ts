// Input: Results from analysis and prediction services
export interface ReviewRequest {
  // From analysis service
  analysis: {
    fileId: string;
    metrics: {
      totalLines: number;
      functionCount: number;
      cyclomaticComplexity: number;
    };
    functions: string[];
    mernPatterns: {
      hasErrorHandling: boolean;
      hasValidation: boolean;
      usesMongoDB: boolean;
      usesExpress: boolean;
      potentialIssues: string[];
    };
    dependencies: {
      hasCycles: boolean;
      directDependencies: string[];
    };
  };
  
  // From prediction service
  prediction: {
  predicted_failure: number;
  failure_probability: number;
  will_fail: boolean;
  confidence: string;
  reasoning?: string; // ✅ Add this field
};
  
  // Full codebase context (like code analysis service receives)
  repoContext?: Array<{ path: string; content: string }>;
  
  // Optional: Original code for testing
  code?: string;
}

export interface BestPractice {
  category: string;
  priority: "high" | "medium" | "low";
  title: string;
  currentState: string;
  recommendedState: string;
  benefits: string;
  implementation: {
    steps: string[];
    codeExample?: string;
  };
  resources?: string[];
}

export interface ReviewResponse {
  summary: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  shouldMerge: boolean;
  issues: ReviewIssue[];
  bestPractices?: BestPractice[];
  recommendations: string[];
  codeQuality: {
    score: number;
    strengths: string[];
    improvementAreas?: string[];
  };
  generatedAt: string;
}

export interface ReviewIssue {
  severity: "critical" | "high" | "medium" | "low";
  category: "bug" | "security" | "performance" | "maintainability" | "style";
  title: string;
  description: string;
  location?: string; // e.g., "register() function"
  suggestion?: string;
}