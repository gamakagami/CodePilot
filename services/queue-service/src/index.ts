import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './api/routes';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

const logger = new Logger('QueueService');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Queue Service (Qstash)',
    version: '2.0.0',
    queueSystem: 'Upstash Qstash',
    endpoints: {
      health: '/api/health',
      addJob: 'POST /api/queues/:queueName/jobs',
      addBulk: 'POST /api/queues/:queueName/jobs/bulk',
      schedule: 'POST /api/queues/:queueName/schedule',
      webhooks: '/api/webhooks/:queueName'
    },
    queues: [
      'code-analysis',
      'email',
      'review',
      'failure-prediction'
    ]
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  logger.success(`Queue Service (Qstash) running on port ${PORT}`);
  logger.info(`Webhook base URL: ${process.env.BASE_URL || 'http://localhost:3000'}`);
  logger.warn('Make sure your webhooks are publicly accessible for Qstash!');
});