import { Request, Response } from 'express';
import axios from 'axios';
import { PredictionJob } from '../types/jobs';
import { Logger } from '../utils/logger';

const logger = new Logger('PredictionWebhook');

export async function handlePrediction(req: Request, res: Response) {
  const { repositoryId, modelVersion, features, userId, _metadata } = req.body as PredictionJob & { _metadata: any };

  logger.processing(`Starting failure prediction for repo: ${repositoryId}`);

  try {
    const response = await axios.post(
      `${process.env.FAILURE_PREDICTION_SERVICE_URL}/api/predict`,
      {
        repositoryId,
        modelVersion,
        features,
        userId,
      },
      {
        timeout: 900000, // 15 minutes
      }
    );

    const predictionResult = response.data;

    logger.success(`Prediction completed for repo: ${repositoryId}`);

    res.status(200).json({
      success: true,
      repositoryId,
      prediction: predictionResult,
      completedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`Prediction failed for repo: ${repositoryId}`, error.message);
    
    res.status(500).json({
      error: 'Failure prediction failed',
      message: error.message,
      repositoryId,
    });
  }
}