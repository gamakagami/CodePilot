export interface CodeAnalysisJob {
  repositoryId: string;
  branch: string;
  userId: string;
  commitHash?: string;
}

export interface EmailJob {
  to: string;
  subject: string;
  body: string;
  template?: string;
  data?: Record<string, any>;
}

export interface ReviewJob {
  pullRequestId: string;
  repositoryId: string;
  userId: string;
  files: string[];
}

export interface PredictionJob {
  repositoryId: string;
  modelVersion: string;
  features: Record<string, any>;
  userId: string;
}

export enum QueueName {
  CODE_ANALYSIS = 'code-analysis',
  EMAIL = 'email',
  REVIEW = 'review',
  PREDICTION = 'failure-prediction',
}

export interface JobMetadata {
  jobId: string;
  queueName: QueueName;
  createdAt: string;
  attempts: number;
}
