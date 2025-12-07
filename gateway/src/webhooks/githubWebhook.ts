import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';

const QUEUE_SERVICE_URL = process.env.QUEUE_SERVICE_URL || 'http://localhost:3000';

// Verify GitHub webhook signature
function verifyGitHubSignature(req: Request): boolean {
  const signature = req.headers['x-hub-signature-256'] as string;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
  if (!signature || !secret) {
    console.warn('Missing GitHub signature or secret');
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (error) {
    return false;
  }
}

export async function handleGitHubWebhook(req: Request, res: Response) {
  try {
    // Verify signature in production
    if (process.env.NODE_ENV === 'production' && !verifyGitHubSignature(req)) {
      console.error('Invalid GitHub signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = req.headers['x-github-event'] as string;
    const payload = req.body;
    
    console.log(`📦 GitHub ${event} event received`);
    
    switch (event) {
      case 'ping':
        return res.json({ message: 'Pong! GitHub webhook configured successfully.' });
        
      case 'push':
        return await handlePushEvent(payload, res);
        
      case 'pull_request':
        return await handlePullRequestEvent(payload, res);
        
      default:
        return res.json({ message: `Event '${event}' received but not processed` });
    }
    
  } catch (error: any) {
    console.error('GitHub webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}

async function handlePushEvent(payload: any, res: Response) {
  const { repository, ref, head_commit, pusher } = payload;
  
  console.log(`🔄 Processing push to ${repository.full_name} on ${ref}`);
  
  try {
    // Queue code analysis job
    const response = await axios.post(
      `${QUEUE_SERVICE_URL}/api/queues/code-analysis/jobs`,
      {
        repositoryId: repository.id.toString(),
        repositoryName: repository.full_name,
        branch: ref.replace('refs/heads/', ''),
        commitHash: head_commit.id,
        commitMessage: head_commit.message,
        userId: pusher.name || pusher.login,
        timestamp: head_commit.timestamp,
      },
      { timeout: 5000 }
    );
    
    console.log(`✅ Code analysis job queued`);
    console.log('📦 Response:', response.data); // DEBUG
    
    res.json({
      message: 'Push event processed successfully',
      repository: repository.full_name,
      branch: ref.replace('refs/heads/', ''),
      jobs: {
        codeAnalysis: response.data || { status: 'processed' }  // Handle empty response
      }
    });
    
  } catch (error: any) {
    console.error('Failed to queue code analysis:', error.message);
    res.status(500).json({ 
      error: 'Failed to queue job',
      message: error.message 
    });
  }
}

async function handlePullRequestEvent(payload: any, res: Response) {
  const { action, pull_request, repository } = payload;
  
  // Only process opened, synchronize, and reopened actions
  if (!['opened', 'synchronize', 'reopened'].includes(action)) {
    return res.json({ 
      message: `PR action '${action}' acknowledged but not processed`,
      supportedActions: ['opened', 'synchronize', 'reopened']
    });
  }
  
  console.log(`🔄 Processing PR #${pull_request.number} action: ${action}`);
  
  try {
    const jobs: any = {};
    
    // Queue review job
    const reviewResponse = await axios.post(
      `${QUEUE_SERVICE_URL}/api/queues/review/jobs`,
      {
        pullRequestId: pull_request.number.toString(),
        pullRequestUrl: pull_request.html_url,
        repositoryId: repository.id.toString(),
        repositoryName: repository.full_name,
        userId: pull_request.user.login,
        branch: pull_request.head.ref,
        baseBranch: pull_request.base.ref,
        title: pull_request.title,
        files: [],
      },
      { timeout: 5000 }
    );
    
    console.log('📦 Review response:', reviewResponse.data); // DEBUG
    
    jobs.review = reviewResponse.data || { status: 'processed' };
    
    // Queue failure prediction
    const predictionResponse = await axios.post(
      `${QUEUE_SERVICE_URL}/api/queues/failure-prediction/jobs`,
      {
        repositoryId: repository.id.toString(),
        repositoryName: repository.full_name,
        pullRequestId: pull_request.number.toString(),
        modelVersion: 'v1.0',
        features: {
          filesChanged: pull_request.changed_files,
          additions: pull_request.additions,
          deletions: pull_request.deletions,
          commits: pull_request.commits,
        },
        userId: pull_request.user.login,
      },
      { timeout: 5000 }
    );
    
    console.log('📦 Prediction response:', predictionResponse.data); // DEBUG
    
    jobs.prediction = predictionResponse.data || { status: 'processed' };
    
    console.log(`✅ PR jobs queued for ${repository.full_name}#${pull_request.number}`);
    
    res.json({
      message: 'Pull request event processed successfully',
      repository: repository.full_name,
      pullRequest: pull_request.number,
      action: action,
      jobs: jobs
    });
    
  } catch (error: any) {
    console.error('Failed to queue PR jobs:', error.message);
    res.status(500).json({ 
      error: 'Failed to queue jobs',
      message: error.message 
    });
  }
}