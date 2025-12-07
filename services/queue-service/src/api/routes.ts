import { Router } from 'express';
import * as queueController from './controllers/queueController';
import { verifyQstashSignature } from '../middleware/verifyQstash';
import { handleCodeAnalysis } from '../webhooks/codeAnalysisWebhook';
import { handleEmail } from '../webhooks/emailWebhook';
import { handleReview } from '../webhooks/reviewWebhook';
import { handlePrediction } from '../webhooks/predictionWebhook';
import { Logger } from '../utils/logger';

const router = Router();
const logger = new Logger('Routes');

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    queueSystem: 'qstash' 
  });
});

const isDevelopment = process.env.NODE_ENV === 'development';
const skipQstash = process.env.SKIP_QSTASH === 'true';

if (isDevelopment && skipQstash) {
  console.warn('⚠️  TESTING MODE: Bypassing Qstash completely');
  console.warn('⚠️  Webhooks will be called directly (synchronous)');
  console.warn('⚠️  This is for LOCAL TESTING ONLY!');
  
  // Direct webhook calls (Option 2)
  router.post('/queues/:queueName/jobs', async (req, res) => {
    const { queueName } = req.params;
    const jobData = req.body;
    
    logger.info(`Direct webhook call for queue: ${queueName}`);
    
    try {
      let webhookHandler;
      
      switch (queueName) {
        case 'email':
          webhookHandler = handleEmail;
          break;
        case 'code-analysis':
          webhookHandler = handleCodeAnalysis;
          break;
        case 'review':
          webhookHandler = handleReview;
          break;
        case 'failure-prediction':
          webhookHandler = handlePrediction;
          break;
        default:
          return res.status(400).json({ 
            error: 'Invalid queue name',
            validQueues: ['code-analysis', 'email', 'review', 'failure-prediction']
          });
      }
      
      // Add metadata
      const jobWithMetadata = {
        ...jobData,
        _metadata: {
          jobId: `test-${queueName}-${Date.now()}`,
          queueName,
          createdAt: new Date().toISOString(),
          attempts: 0
        }
      };
      
      // Call webhook directly
      const mockReq = { body: jobWithMetadata } as any;
      await webhookHandler(mockReq, res);
      
    } catch (error: any) {
      logger.error('Direct webhook call failed', error);
      res.status(500).json({ 
        error: 'Failed to process job', 
        message: error.message 
      });
    }
  });
  
  // Bulk jobs - process each directly
  router.post('/queues/:queueName/jobs/bulk', async (req, res) => {
    const { queueName } = req.params;
    const { jobs } = req.body;
    
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ error: 'Jobs must be a non-empty array' });
    }
    
    logger.info(`Processing ${jobs.length} jobs directly for queue: ${queueName}`);
    
    try {
      const results = [];
      
      for (const job of jobs) {
        const jobId = `test-${queueName}-${Date.now()}-${Math.random()}`;
        results.push({ jobId, status: 'processed' });
        
        // Process each job (in real scenario, you'd call the webhook)
        // For now, just acknowledge
      }
      
      res.status(202).json({
        message: `${results.length} jobs processed`,
        jobs: results,
        queueName
      });
      
    } catch (error: any) {
      logger.error('Bulk processing failed', error);
      res.status(500).json({ 
        error: 'Failed to process bulk jobs', 
        message: error.message 
      });
    }
  });
  
  // Schedule not supported in test mode
  router.post('/queues/:queueName/schedule', (req, res) => {
    res.status(501).json({ 
      error: 'Scheduling not available in test mode',
      message: 'Use SKIP_QSTASH=false and ngrok for scheduling'
    });
  });
  
} else {
  // Production mode - Use real Qstash (Option 1)
  router.post('/queues/:queueName/jobs', queueController.addJob);
  router.post('/queues/:queueName/jobs/bulk', queueController.addBulkJobs);
  router.post('/queues/:queueName/schedule', queueController.scheduleJob);
  
  // Webhook routes (called by Qstash)
  const skipVerification = process.env.SKIP_QSTASH_VERIFICATION === 'true';
  
  if (isDevelopment && skipVerification) {
    console.warn('⚠️  WARNING: Qstash signature verification is DISABLED');
    router.post('/webhooks/code-analysis', handleCodeAnalysis);
    router.post('/webhooks/email', handleEmail);
    router.post('/webhooks/review', handleReview);
    router.post('/webhooks/failure-prediction', handlePrediction);
  } else {
    router.post('/webhooks/code-analysis', verifyQstashSignature, handleCodeAnalysis);
    router.post('/webhooks/email', verifyQstashSignature, handleEmail);
    router.post('/webhooks/review', verifyQstashSignature, handleReview);
    router.post('/webhooks/failure-prediction', verifyQstashSignature, handlePrediction);
  }
}

export default router;