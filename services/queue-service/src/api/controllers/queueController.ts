import { Request, Response } from 'express';
import { queueService } from '../../services/queueService';
import { QueueName } from '../../types/jobs';
import { Logger } from '../../utils/logger';

const logger = new Logger('QueueController');

export const addJob = async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const jobData = req.body;
    const options = req.body.options || {};

    // Validate queue name
    if (!Object.values(QueueName).includes(queueName as QueueName)) {
      return res.status(400).json({
        error: 'Invalid queue name',
        validQueues: Object.values(QueueName),
      });
    }

    // Remove options from job data
    const { options: _, ...cleanJobData } = jobData;

    // Publish job to Qstash
    const result = await queueService.publishJob(
      queueName as QueueName,
      cleanJobData,
      options
    );

    logger.success(`Job ${result.jobId} added to ${queueName} queue`);

    res.status(202).json({
      message: 'Job queued successfully',
      jobId: result.jobId,
      messageId: result.messageId,
      queueName,
      data: cleanJobData,
    });
  } catch (error: any) {
    logger.error('Failed to add job', error);
    res.status(500).json({
      error: 'Failed to queue job',
      message: error.message,
    });
  }
};

export const addBulkJobs = async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const { jobs } = req.body;

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ error: 'Jobs must be a non-empty array' });
    }

    // Validate queue name
    if (!Object.values(QueueName).includes(queueName as QueueName)) {
      return res.status(400).json({
        error: 'Invalid queue name',
        validQueues: Object.values(QueueName),
      });
    }

    const results = await queueService.publishBulkJobs(
      queueName as QueueName,
      jobs
    );

    logger.success(`${results.length} jobs added to ${queueName} queue`);

    res.status(202).json({
      message: `${results.length} jobs queued successfully`,
      jobs: results,
      queueName,
    });
  } catch (error: any) {
    logger.error('Failed to add bulk jobs', error);
    res.status(500).json({
      error: 'Failed to queue bulk jobs',
      message: error.message,
    });
  }
};

export const scheduleJob = async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const { scheduleTime, ...jobData } = req.body;

    if (!scheduleTime) {
      return res.status(400).json({ error: 'scheduleTime is required' });
    }

    // Validate queue name
    if (!Object.values(QueueName).includes(queueName as QueueName)) {
      return res.status(400).json({
        error: 'Invalid queue name',
        validQueues: Object.values(QueueName),
      });
    }

    const scheduleDate = new Date(scheduleTime);
    
    const result = await queueService.scheduleJob(
      queueName as QueueName,
      jobData,
      scheduleDate
    );

    logger.success(`Job ${result.jobId} scheduled for ${scheduleDate.toISOString()}`);

    res.status(202).json({
      message: 'Job scheduled successfully',
      jobId: result.jobId,
      messageId: result.messageId,
      queueName,
      scheduledFor: scheduleDate.toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to schedule job', error);
    res.status(500).json({
      error: 'Failed to schedule job',
      message: error.message,
    });
  }
};