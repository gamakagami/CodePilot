import { Request, Response } from 'express';
import axios from 'axios';
import { CodeAnalysisJob } from '../types/jobs';
import { Logger } from '../utils/logger';

const logger = new Logger('CodeAnalysisWebhook');

export async function handleCodeAnalysis(req: Request, res: Response) {
  const { repositoryId, branch, userId, commitHash, _metadata } = req.body as CodeAnalysisJob & { _metadata: any };

  logger.processing(`Processing code analysis for repo: ${repositoryId}`);

  try {
    // Call code-analysis-service
    const response = await axios.post(
      `${process.env.CODE_ANALYSIS_SERVICE_URL}/api/analyze`,
      {
        repositoryId,
        branch,
        commitHash,
        userId,
      },
      {
        timeout: 300000, // 5 minutes
      }
    );

    const analysisResult = response.data;

    logger.success(`Analysis completed for repo: ${repositoryId}`);

    // Return success response to Qstash
    res.status(200).json({
      success: true,
      repositoryId,
      analysis: analysisResult,
      completedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`Analysis failed for repo: ${repositoryId}`, error.message);
    
    // Return error - Qstash will retry based on configuration
    res.status(500).json({
      error: 'Code analysis failed',
      message: error.message,
      repositoryId,
    });
  }
}