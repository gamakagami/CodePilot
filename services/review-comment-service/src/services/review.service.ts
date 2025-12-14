import { llmClient } from "../utils/llmClient";
import { ReviewRequest, ReviewResponse, ReviewIssue } from "../types/review.types";

export const reviewService = {
  async generateReview(request: ReviewRequest): Promise<ReviewResponse> {
    console.log(`🔍 Generating review for ${request.analysis.fileId}...`);

    const prompt = this.buildReviewPrompt(request);
    const llmResponse = await llmClient(prompt);
    const review = this.parseReviewResponse(llmResponse, request);

    console.log(`Review generated: ${review.issues.length} issues, ${review.bestPractices?.length || 0} best practice suggestions`);
    return review;
  },

  buildReviewPrompt(request: ReviewRequest): string {
    const { analysis, prediction } = request;

    return `You are a professional code review system. Generate a structured JSON review that separates:
1. CRITICAL ISSUES (bugs, security flaws, breaking changes)
2. BEST PRACTICE SUGGESTIONS (improvements, optimizations, code quality)

# ANALYSIS DATA
File: ${analysis.fileId}
Lines: ${analysis.metrics.totalLines}
Functions: ${analysis.metrics.functionCount}
Complexity: ${analysis.metrics.cyclomaticComplexity}
Error Handling: ${analysis.mernPatterns.hasErrorHandling ? 'Present' : 'Missing'}
Validation: ${analysis.mernPatterns.hasValidation ? 'Present' : 'Missing'}
Express: ${analysis.mernPatterns.usesExpress ? 'Yes' : 'No'}
MongoDB: ${analysis.mernPatterns.usesMongoDB ? 'Yes' : 'No'}
Circular Dependencies: ${analysis.dependencies.hasCycles ? 'Yes' : 'No'}
Failure Probability: ${(prediction.failure_probability * 100).toFixed(1)}%
Will Fail: ${prediction.will_fail ? 'Yes' : 'No'}
Prediction Reasoning: ${prediction.reasoning || 'Not provided'}

# DETECTED PATTERNS
${analysis.mernPatterns.potentialIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n') || 'None'}

# OUTPUT REQUIREMENTS

## 1. ISSUES (Critical Problems Only)
Only include if there are ACTUAL BUGS, SECURITY FLAWS, or BREAKING CHANGES that will cause failures:
- Null pointer access
- Type errors
- Breaking API changes
- Security vulnerabilities
- Logic errors that cause incorrect behavior

DO NOT include style issues or missing best practices here.

## 2. BEST PRACTICES (Separate Section)
Include advice for code quality improvements:
- Missing error handling (as advice, not critical issue)
- Missing validation (as advice, not critical issue)
- High complexity (as advice, not critical issue)
- Missing tests
- Performance optimizations
- Code organization suggestions
- Logging improvements

Each best practice must have:
- Clear category (Error Handling, Validation, Testing, Performance, etc.)
- Current state vs. recommended state
- Step-by-step implementation guide
- Code example if applicable

# OUTPUT JSON SCHEMA

{
  "summary": "Comprehensive review of ${analysis.fileId} (${analysis.metrics.totalLines} lines, ${analysis.metrics.functionCount} functions). ${prediction.will_fail ? 'ML model predicts FAILURE' : 'ML model predicts SUCCESS'} with ${(prediction.failure_probability * 100).toFixed(1)}% failure probability (${prediction.confidence} confidence). Reasoning: ${prediction.reasoning || 'N/A'}. Found [X] critical issues and [Y] best practice suggestions.",
  
  "riskLevel": "${this.determineRiskLevel(prediction.failure_probability, analysis.metrics.cyclomaticComplexity)}",
  
  "shouldMerge": ${this.shouldMerge(prediction.failure_probability, analysis.metrics.cyclomaticComplexity)},
  
  "issues": [
    {
      "severity": "critical|high",
      "category": "bug|security",
      "title": "Specific bug or security flaw",
      "description": "Detailed explanation of the ACTUAL problem that will cause failure",
      "location": "${analysis.fileId} - specific function or line",
      "impact": "What will break and how",
      "suggestion": "Step-by-step fix with code example"
    }
  ],
  
  "bestPractices": [
    {
      "category": "Error Handling|Validation|Testing|Performance|Security|Code Quality|Architecture",
      "priority": "high|medium|low",
      "title": "Clear, actionable title",
      "currentState": "What the code currently does",
      "recommendedState": "What the code should do",
      "benefits": "Why this improvement matters",
      "implementation": {
        "steps": [
          "Step 1: ...",
          "Step 2: ...",
          "Step 3: ..."
        ],
        "codeExample": "// Optional code snippet showing the fix"
      },
      "resources": ["Link to documentation or article (optional)"]
    }
  ],
  
  "recommendations": [
    "⚠️ CRITICAL: [only if actual bugs found]",
    "🎯 PRIORITY: [important best practices]",
    "💡 SUGGESTION: [nice-to-have improvements]",
    "✅ [positive feedback if applicable]"
  ],
  
  "codeQuality": {
    "score": ${this.calculateQualityScore(analysis)},
    "strengths": ["Specific positive aspects"],
    "improvementAreas": ["Specific areas that could be better (not failures)"]
  }
}

IMPORTANT DISTINCTIONS:
- "issues" = Will cause ACTUAL failures (bugs, security, breaking changes)
- "bestPractices" = Should improve but won't necessarily cause failures
- If ML model predicts PASS and no concrete bugs found, issues array should be EMPTY
- Best practices suggestions should be comprehensive and educational

Return ONLY valid JSON, no markdown formatting.`;
  },

  determineRiskLevel(failureProbability: number, complexity: number): string {
    if (failureProbability > 0.7) return "critical";
    if (failureProbability > 0.5) return "high";
    if (failureProbability > 0.3 || complexity > 15) return "medium";
    return "low";
  },

  shouldMerge(failureProbability: number, complexity: number): boolean {
    const riskLevel = this.determineRiskLevel(failureProbability, complexity);
    return riskLevel === "low" || riskLevel === "medium";
  },

  parseReviewResponse(llmResponse: string, request: ReviewRequest): ReviewResponse {
    try {
      const cleaned = llmResponse.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        summary: parsed.summary,
        riskLevel: parsed.riskLevel,
        shouldMerge: parsed.shouldMerge,
        issues: parsed.issues || [],
        bestPractices: parsed.bestPractices || [],
        recommendations: parsed.recommendations || [],
        codeQuality: parsed.codeQuality || {
          score: 50,
          strengths: [],
          improvementAreas: []
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Failed to parse LLM response as JSON:", error);
      return this.createFallbackReview(request);
    }
  },

  createFallbackReview(request: ReviewRequest): ReviewResponse {
    const { analysis, prediction } = request;
    
    // Separate critical issues from best practices
    const criticalIssues: ReviewIssue[] = [];
    const bestPractices: any[] = [];

    // Only add to critical issues if prediction says it will fail
    if (prediction.will_fail && prediction.reasoning) {
      criticalIssues.push({
        severity: "high",
        category: "bug",
        title: "Predicted Failure",
        description: `ML model predicts failure. ${prediction.reasoning}`,
        location: analysis.fileId,
        impact: "Code may fail in production or testing",
        suggestion: "Review the specific issues mentioned in the reasoning and address them before merging"
      });
    }

    // Convert detected issues to best practices (not critical issues)
    analysis.mernPatterns.potentialIssues.forEach(issue => {
      bestPractices.push(this.convertIssueToBestPractice(issue, analysis));
    });

    // Add standard best practices based on analysis
    if (!analysis.mernPatterns.hasErrorHandling) {
      bestPractices.push({
        category: "Error Handling",
        priority: "high",
        title: "Implement Comprehensive Error Handling",
        currentState: `${analysis.metrics.functionCount} async functions lack try-catch error handling`,
        recommendedState: "All async operations should be wrapped in try-catch blocks to handle errors gracefully",
        benefits: "Prevents unhandled promise rejections, improves error visibility, enables proper error responses to clients",
        implementation: {
          steps: [
            "Identify all async functions in the codebase",
            "Wrap database operations in try-catch blocks",
            "Return appropriate HTTP status codes (500 for server errors)",
            "Log errors for debugging and monitoring",
            "Consider using express-async-errors middleware for automatic error handling"
          ],
          codeExample: `// Before
async function getUser(id) {
  const user = await User.findById(id);
  return user;
}

// After
async function getUser(id) {
  try {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}`
        },
        resources: ["https://expressjs.com/en/guide/error-handling.html"]
      });
    }

    if (!analysis.mernPatterns.hasValidation) {
      bestPractices.push({
        category: "Validation",
        priority: "high",
        title: "Add Input Validation",
        currentState: "No schema validation library detected (Joi, Zod, express-validator)",
        recommendedState: "Validate all user inputs before processing to ensure data integrity",
        benefits: "Prevents invalid data from entering the system, improves data quality, reduces debugging time",
        implementation: {
          steps: [
            "Choose a validation library (Joi, Zod, or express-validator)",
            "Install the library: npm install joi (or your chosen library)",
            "Create validation schemas for your data models",
            "Add validation middleware to routes",
            "Return 400 Bad Request for validation failures with clear error messages"
          ],
          codeExample: `// Using Joi
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  age: Joi.number().integer().min(18)
});

app.post('/users', async (req, res) => {
  try {
    const validated = await userSchema.validateAsync(req.body);
    // Process validated data
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});`
        },
        resources: ["https://joi.dev/api/", "https://github.com/colinhacks/zod"]
      });
    }

    if (analysis.metrics.cyclomaticComplexity > 15) {
      bestPractices.push({
        category: "Code Quality",
        priority: analysis.metrics.cyclomaticComplexity > 20 ? "high" : "medium",
        title: "Reduce Cyclomatic Complexity",
        currentState: `Current complexity: ${analysis.metrics.cyclomaticComplexity} (threshold: 10-15)`,
        recommendedState: "Break down complex functions into smaller, single-responsibility functions",
        benefits: "Improves testability, readability, and maintainability; reduces bugs",
        implementation: {
          steps: [
            "Identify functions with high complexity",
            "Extract complex conditionals into separate functions",
            "Use early returns to reduce nesting",
            "Apply the Single Responsibility Principle",
            "Consider using design patterns (Strategy, Command) for complex logic"
          ],
          codeExample: `// Before (complex)
function processOrder(order) {
  if (order.status === 'pending') {
    if (order.payment === 'card') {
      if (order.amount > 100) {
        // complex logic
      } else {
        // more logic
      }
    } else if (order.payment === 'cash') {
      // different logic
    }
  }
}

// After (simpler)
function processOrder(order) {
  if (order.status !== 'pending') return;
  
  if (order.payment === 'card') {
    return processCardPayment(order);
  }
  
  if (order.payment === 'cash') {
    return processCashPayment(order);
  }
}

function processCardPayment(order) {
  if (order.amount > 100) {
    return handleLargeTransaction(order);
  }
  return handleSmallTransaction(order);
}`
        },
        resources: []
      });
    }

    if (analysis.dependencies.hasCycles) {
      bestPractices.push({
        category: "Architecture",
        priority: "medium",
        title: "Resolve Circular Dependencies",
        currentState: "Circular dependencies detected in module imports",
        recommendedState: "Clean, acyclic dependency graph with clear module hierarchy",
        benefits: "Prevents import order issues, improves code organization, enables better tree-shaking",
        implementation: {
          steps: [
            "Identify circular dependencies using dependency analysis tools",
            "Extract shared code into separate modules",
            "Use dependency injection to break cycles",
            "Restructure modules to follow a layered architecture",
            "Consider using an index file for barrel exports"
          ],
          codeExample: `// Before (circular)
// userService.js
import { validateOrder } from './orderService';

// orderService.js  
import { getUser } from './userService';

// After (resolved)
// Create shared/validators.js
export function validateOrder(order) { ... }

// userService.js
import { validateOrder } from './shared/validators';

// orderService.js
// No import from userService, inject user data as parameter`
        },
        resources: ["https://nodejs.org/api/modules.html#modules_cycles"]
      });
    }

    // Add testing recommendation if no tests detected
    bestPractices.push({
      category: "Testing",
      priority: "medium",
      title: "Add Unit and Integration Tests",
      currentState: "No test files detected in the analysis",
      recommendedState: "Comprehensive test coverage for business logic and API endpoints",
      benefits: "Catches bugs early, enables confident refactoring, serves as documentation",
      implementation: {
        steps: [
          "Set up testing framework (Jest, Mocha, or Vitest)",
          "Write unit tests for pure functions and utilities",
          "Write integration tests for API endpoints",
          "Mock external dependencies (database, APIs)",
          "Aim for >80% code coverage on critical paths",
          "Run tests in CI/CD pipeline"
        ],
        codeExample: `// Example with Jest
const { getUser } = require('./userService');

describe('User Service', () => {
  test('should return user by id', async () => {
    const user = await getUser('123');
    expect(user).toBeDefined();
    expect(user.id).toBe('123');
  });
  
  test('should throw error for invalid id', async () => {
    await expect(getUser(null)).rejects.toThrow();
  });
});`
      },
      resources: ["https://jestjs.io/docs/getting-started"]
    });

    const riskLevel = this.determineRiskLevel(prediction.failure_probability, analysis.metrics.cyclomaticComplexity);
    const issueCount = criticalIssues.length;
    const bpCount = bestPractices.length;
    
    const summary = `Comprehensive review of ${analysis.fileId} (${analysis.metrics.totalLines} lines, ${analysis.metrics.functionCount} functions). ${prediction.will_fail ? 'ML model predicts FAILURE' : 'ML model predicts SUCCESS'} with ${(prediction.failure_probability * 100).toFixed(1)}% failure probability (${prediction.confidence} confidence). ${prediction.reasoning ? 'Reasoning: ' + prediction.reasoning : 'No specific issues detected.'} Found ${issueCount} critical issue${issueCount !== 1 ? 's' : ''} and ${bpCount} best practice suggestion${bpCount !== 1 ? 's' : ''}.`;

    return {
      summary,
      riskLevel: riskLevel as "low" | "medium" | "high" | "critical",
      shouldMerge: this.shouldMerge(prediction.failure_probability, analysis.metrics.cyclomaticComplexity),
      issues: criticalIssues,
      bestPractices: bestPractices,
      recommendations: this.generateDetailedRecommendations(analysis, prediction, criticalIssues, bestPractices),
      codeQuality: {
        score: this.calculateQualityScore(analysis),
        strengths: this.identifyDetailedStrengths(analysis),
        improvementAreas: this.identifyImprovementAreas(analysis, bestPractices)
      },
      generatedAt: new Date().toISOString()
    };
  },

  convertIssueToBestPractice(issue: string, analysis: any): any {
    const lowerIssue = issue.toLowerCase();

    if (lowerIssue.includes('console.log')) {
      return {
        category: "Logging",
        priority: "low",
        title: "Replace console.log with Proper Logging",
        currentState: "Using console.log for logging",
        recommendedState: "Use a structured logging library (Winston, Pino, or Bunyan)",
        benefits: "Better log management, log levels, structured output, production-ready logging",
        implementation: {
          steps: [
            "Install Winston: npm install winston",
            "Create a logger configuration file",
            "Replace console.log with logger.info/error/warn",
            "Configure different transports (console, file, cloud)",
            "Set appropriate log levels for different environments"
          ],
          codeExample: `const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Use instead of console.log
logger.info('User logged in', { userId: user.id });
logger.error('Database error', { error: err.message });`
        },
        resources: ["https://github.com/winstonjs/winston"]
      };
    }

    if (lowerIssue.includes('status code')) {
      return {
        category: "API Design",
        priority: "medium",
        title: "Always Return Explicit HTTP Status Codes",
        currentState: "Some responses lack explicit status codes",
        recommendedState: "All API responses should include appropriate HTTP status codes",
        benefits: "Clear API contracts, better error handling on client side, REST compliance",
        implementation: {
          steps: [
            "Review all route handlers",
            "Add explicit status codes: res.status(code).json(...)",
            "Use standard codes: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found), 500 (Server Error)",
            "Document status codes in API documentation"
          ],
          codeExample: `// Before
res.json({ user: user });

// After
res.status(200).json({ user: user }); // Success
res.status(404).json({ error: 'User not found' }); // Not found
res.status(500).json({ error: 'Server error' }); // Server error`
        },
        resources: ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Status"]
      };
    }

    if (lowerIssue.includes('injection')) {
      return {
        category: "Security",
        priority: "high",
        title: "Prevent SQL/NoSQL Injection Attacks",
        currentState: "Potential injection vulnerability detected",
        recommendedState: "Use parameterized queries or ORM methods exclusively",
        benefits: "Prevents data breaches, protects user data, maintains database integrity",
        implementation: {
          steps: [
            "Never concatenate user input directly into queries",
            "Use Mongoose methods instead of raw queries",
            "Sanitize and validate all user inputs",
            "Use prepared statements for raw SQL queries",
            "Enable MongoDB query operator restrictions"
          ],
          codeExample: `// DANGEROUS - Don't do this
const user = await User.find({ email: req.body.email }); // Risky if not validated
db.query("SELECT * FROM users WHERE email = '" + email + "'"); // SQL Injection!

// SAFE - Do this instead
const user = await User.findOne({ email: req.body.email }); // Mongoose handles escaping
const user = await db.query('SELECT * FROM users WHERE email = $1', [email]); // Parameterized`
        },
        resources: ["https://owasp.org/www-community/attacks/SQL_Injection"]
      };
    }

    // Generic conversion
    return {
      category: "Code Quality",
      priority: "low",
      title: issue,
      currentState: `Issue detected: ${issue}`,
      recommendedState: "Follow MERN stack best practices",
      benefits: "Improves code quality and maintainability",
      implementation: {
        steps: ["Review the code", "Apply appropriate fixes", "Test the changes"],
        codeExample: ""
      },
      resources: []
    };
  },

  generateDetailedRecommendations(analysis: any, prediction: any, issues: any[], bestPractices: any[]): string[] {
    const recommendations: string[] = [];

    // Critical issues first
    if (issues.length > 0) {
      recommendations.push(
        `⚠️ CRITICAL: ${issues.length} critical issue${issues.length !== 1 ? 's' : ''} found that may cause failures - address before merging`
      );
    }

    // ML prediction
    if (prediction.will_fail) {
      recommendations.push(
        `⚠️ CRITICAL: ML model predicts failure with ${(prediction.failure_probability * 100).toFixed(1)}% probability - review reasoning: ${prediction.reasoning || 'Not provided'}`
      );
    }

    // High priority best practices
    const highPriorityBPs = bestPractices.filter(bp => bp.priority === 'high');
    if (highPriorityBPs.length > 0) {
      recommendations.push(
        `🎯 PRIORITY: ${highPriorityBPs.length} high-priority improvement${highPriorityBPs.length !== 1 ? 's' : ''} recommended: ${highPriorityBPs.map(bp => bp.category).join(', ')}`
      );
    }

    // Medium/low priority suggestions
    const lowerPriorityBPs = bestPractices.filter(bp => bp.priority !== 'high');
    if (lowerPriorityBPs.length > 0) {
      recommendations.push(
        `💡 SUGGESTION: ${lowerPriorityBPs.length} additional improvement${lowerPriorityBPs.length !== 1 ? 's' : ''} available for better code quality`
      );
    }

    // Positive feedback
    if (issues.length === 0 && !prediction.will_fail) {
      recommendations.push(
        `✅ Code looks solid - proceed with standard review process and ensure adequate test coverage`
      );
    }

    return recommendations;
  },

  calculateQualityScore(analysis: any): number {
    let score = 100;

    if (analysis.metrics.cyclomaticComplexity > 20) score -= 30;
    else if (analysis.metrics.cyclomaticComplexity > 10) score -= 15;

    if (!analysis.mernPatterns.hasErrorHandling) score -= 20;
    if (!analysis.mernPatterns.hasValidation) score -= 15;

    score -= Math.min(analysis.mernPatterns.potentialIssues.length * 5, 25);

    if (analysis.dependencies.hasCycles) score -= 15;

    return Math.max(score, 0);
  },

  identifyDetailedStrengths(analysis: any): string[] {
    const strengths: string[] = [];

    if (analysis.mernPatterns.hasErrorHandling) {
      strengths.push('Implements error handling with try-catch blocks');
    }

    if (analysis.mernPatterns.hasValidation) {
      strengths.push('Uses input validation to prevent invalid data');
    }

    if (analysis.metrics.cyclomaticComplexity < 10) {
      strengths.push(`Low complexity (${analysis.metrics.cyclomaticComplexity}) indicates maintainable code`);
    }

    if (!analysis.dependencies.hasCycles) {
      strengths.push('Clean dependency structure with no circular dependencies');
    }

    if (analysis.mernPatterns.usesExpress && analysis.mernPatterns.usesMongoDB) {
      strengths.push('Properly utilizes MERN stack with Express and MongoDB');
    }

    return strengths.length > 0 ? strengths : ['Follows basic MERN stack structure'];
  },

  identifyImprovementAreas(analysis: any, bestPractices: any[]): string[] {
    return bestPractices.map(bp => `${bp.category}: ${bp.title}`);
  }
};