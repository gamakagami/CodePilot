import { qstashClient, qstashConfig } from '../config/qstash';
import { QueueName, JobMetadata } from '../types/jobs';
import { Logger } from '../utils/logger';

const logger = new Logger('QueueService');

export class QueueService {
  private getWebhookUrl(queueName: QueueName): string {
    return `${qstashConfig.baseUrl}/webhooks/${queueName}`;
  }

  async publishJob(
    queueName: QueueName,
    jobData: any,
    options?: {
      delay?: number;
      retries?: number;
      headers?: Record<string, string>;
    }
  ) {
    try {
      const webhookUrl = this.getWebhookUrl(queueName);
      const jobId = `${queueName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const metadata: JobMetadata = {
        jobId,
        queueName,
        createdAt: new Date().toISOString(),
        attempts: 0,
      };

      const payload = {
        ...jobData,
        _metadata: metadata,
      };

      logger.info(`Publishing job ${jobId} to ${queueName}`);

      const response = await qstashClient.publishJSON({
        url: webhookUrl,
        body: payload,
        retries: options?.retries ?? qstashConfig.maxRetries,
        delay: options?.delay,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      logger.success(`Job ${jobId} published successfully`);

      return {
        jobId,
        messageId: response.messageId,
        queueName,
      };
    } catch (error: any) {
      logger.error(`Failed to publish job to ${queueName}`, error);
      throw error;
    }
  }

  async publishBulkJobs(queueName: QueueName, jobs: any[]) {
    try {
      const results = await Promise.all(
        jobs.map(job => this.publishJob(queueName, job))
      );

      logger.success(`Published ${results.length} jobs to ${queueName}`);

      return results;
    } catch (error: any) {
      logger.error(`Failed to publish bulk jobs to ${queueName}`, error);
      throw error;
    }
  }

  async scheduleJob(
    queueName: QueueName,
    jobData: any,
    scheduleTime: Date | number
  ) {
    try {
      const webhookUrl = this.getWebhookUrl(queueName);
      const delay = typeof scheduleTime === 'number' 
        ? scheduleTime 
        : scheduleTime.getTime() - Date.now();

      if (delay < 0) {
        throw new Error('Schedule time must be in the future');
      }

      return await this.publishJob(queueName, jobData, { delay });
    } catch (error: any) {
      logger.error(`Failed to schedule job`, error);
      throw error;
    }
  }
}

export const queueService = new QueueService();
