// mock-services.js
// Run this to simulate all the external services the queue calls

const express = require('express');
const app = express();
app.use(express.json());

// Mock Code Analysis Service (Port 3002)
app.post('/api/analyze', (req, res) => {
  console.log('📊 Mock Code Analysis received:', req.body);
  setTimeout(() => {
    res.json({
      success: true,
      analysis: {
        linesOfCode: 1234,
        complexity: 15,
        issues: [
          { type: 'warning', message: 'Unused variable', line: 42 }
        ],
        score: 85
      }
    });
  }, 2000); // Simulate 2s processing
});

// Mock Auth Service Email (Port 3001)
app.post('/api/email/send', (req, res) => {
  console.log('📧 Mock Email sent to:', req.body.to);
  setTimeout(() => {
    res.json({
      success: true,
      messageId: 'mock-' + Date.now()
    });
  }, 500);
});

// Mock Review Service (Port 3003)
app.post('/api/review/generate', (req, res) => {
  console.log('📝 Mock Review generated for PR:', req.body.pullRequestId);
  setTimeout(() => {
    res.json({
      success: true,
      review: {
        comments: [
          { file: 'index.ts', line: 10, comment: 'Consider refactoring this' }
        ],
        summary: 'Looks good overall'
      }
    });
  }, 3000);
});

// Mock Failure Prediction Service (Port 3004)
app.post('/api/predict', (req, res) => {
  console.log('🔮 Mock Prediction for repo:', req.body.repositoryId);
  setTimeout(() => {
    res.json({
      success: true,
      prediction: {
        failureProbability: 0.15,
        confidence: 0.92,
        factors: ['code_complexity', 'test_coverage']
      }
    });
  }, 4000);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mock-services' });
});

// Start mock server on port 4000 (proxy all services)
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🎭 Mock Services running on port ${PORT}`);
  console.log('   Code Analysis: POST /api/analyze');
  console.log('   Email: POST /api/email/send');
  console.log('   Review: POST /api/review/generate');
  console.log('   Prediction: POST /api/predict');
});

// Or run separate ports:
/*
const authApp = express();
authApp.use(express.json());
authApp.post('/api/email/send', ...);
authApp.listen(3001, () => console.log('Mock Auth on 3001'));

const codeApp = express();
codeApp.use(express.json());
codeApp.post('/api/analyze', ...);
codeApp.listen(3002, () => console.log('Mock Code Analysis on 3002'));

// ... etc
*/