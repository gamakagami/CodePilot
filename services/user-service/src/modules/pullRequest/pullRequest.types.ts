export interface PullRequestDetail {
  id: number;
  number: number; //
  title: string;
  repository: string; // 
  author: string;
  createdAt: Date;
  status: string;
  riskScore: number;
  predictedFailure: boolean | null;
  actualFailure: boolean | null; // 
  featureImportance: {
    filesChanged: number;
    avgComplexity: number;
    linesAdded: number;
    buildDuration: number;
  };
  changedFiles: {
    filename: string;
    additions: number;
    deletions: number;
    diff: string;
  }[];
  reviewComments: {
    file: string;
    line: number;
    comment: string;
  }[];
  analysisSummary: string | null;
  analysisDuration: number | null;
  rating: number | null;
  ratingHistory: {
    rating: number;
    createdAt: Date;
  }[];
}