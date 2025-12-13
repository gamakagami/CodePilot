export interface PullRequestDetail {
  id: number;
  number: number;
  title: string;
  author: string;
  status: string;
  createdAt: Date;
  
  // Repository info
  repository: string;
  repositoryLastAnalyzed: Date | null; // ✅ Added
  repositoryFailureRate: number | null; // ✅ Added
  
  // PR analysis
  riskScore: number;
  predictedFailure: boolean | null;
  actualFailure: boolean | null;
  analysisSummary: string | null;
  analysisDuration: number | null;
  lastAnalyzed: Date | null; // ✅ Added
  
  // Ratings
  rating: number | null;
  ratingHistory: {
    rating: number;
    createdAt: Date;
  }[];
  
  // Files
  changedFiles: {
    filename: string;
    additions: number;
    deletions: number;
    diff: string;
    complexity: number; // ✅ Added
  }[];
  
  // Comments
  reviewComments: {
    file: string;
    line: number;
    comment: string;
  }[];
  
  // Feature importance
  featureImportance: {
    filesChanged: number;
    avgComplexity: number;
    linesAdded: number;
    linesDeleted: number; // ✅ Added
    buildDuration: number;
  };
}