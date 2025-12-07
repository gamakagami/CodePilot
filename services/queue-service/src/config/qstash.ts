import dotenv from 'dotenv';
import { Client } from '@upstash/qstash';

// Load environment variables first
dotenv.config();

if (!process.env.QSTASH_TOKEN) {
  console.error('❌ QSTASH_TOKEN is not set in .env file');
  console.error('Please add the following to your .env file:');
  console.error('QSTASH_TOKEN=your_token_here');
  throw new Error('QSTASH_TOKEN is required');
}

export const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export const qstashConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY || '2000'),
};