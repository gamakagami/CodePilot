import { Request, Response } from 'express';
import axios from 'axios';
import { ReviewJob } from '../types/jobs';
import { Logger } from '../utils/logger';

const logger = new Logger('ReviewWebhook');

export async function handleReview(req: Request, res: Response) {
  const { pullRequestId, repositoryId, userId, files, _metadata } = req.body as ReviewJob & { _metadata: any };

  logger.processing(`Starting review for PR: ${pullRequestId}`);

  try {
    const response = await axios.post(
      `${process.env.REVIEW_SERVICE_URL}/api/review/generate`,
      {
        pullRequestId,
        repositoryId,
        userId,
        files,
      },
      {
        timeout: 600000, // 10 minutes
      }
    );

    const reviewResult = response.data;

    logger.success(`Review completed for PR: ${pullRequestId}`);

    res.status(200).json({
      success: true,
      pullRequestId,
      review: reviewResult,
      completedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`Review failed for PR: ${pullRequestId}`, error.message);
    
    res.status(500).json({
      error: 'Review generation failed',
      message: error.message,
      pullRequestId,
    });
  }
}
