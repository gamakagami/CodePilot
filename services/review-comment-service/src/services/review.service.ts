import { llmClient } from "../utils/llmClient";
import { CodeAnalysisResult } from "./analysis.service";

export interface ReviewRequest {
  analysis: CodeAnalysisResult;
  prediction: {
    will_fail: boolean;
    failure_probability: number;
    confidence: string;
    reasoning?: string;
  };
  context?: {
    prNumber?: string;
    author?: string;
    branch?: string;
  };
}

export interface ReviewIssue {
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  location: string;
  codeSnippet?: string;
  impact: string;
  suggestion: string;
  resources?: string[];
}

export interface BestPractice {
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  currentState: string;
  recommendedState: string;
  benefits: string;
  implementation: {
    steps: string[];
    codeExample?: string;
  };
  resources?: string[];
}

export interface ReviewResponse {
  summary: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  shouldMerge: boolean;
  issues: ReviewIssue[];
  bestPractices: BestPractice[];
  recommendations: string[];
  codeQuality: {
    score: number;
    strengths: string[];
    improvementAreas: string[];
  };
  generatedAt: string;
}

export const reviewService = {
  async generateReview(request: ReviewRequest): Promise<ReviewResponse> {
    console.log(`🔍 [FEEDBACK SERVICE] ===== STARTING FEEDBACK GENERATION =====`);
    console.log(`🔍 [FEEDBACK SERVICE] File: ${request.analysis.fileId}`);
    console.log(`🔍 [FEEDBACK SERVICE] Prediction: will_fail=${request.prediction.will_fail}, probability=${request.prediction.failure_probability}`);

    const prompt = this.buildReviewPrompt(request);
    
    console.log(`🔍 [FEEDBACK SERVICE] Prompt generated, length: ${prompt.length} chars`);
    console.log(`🔍 [FEEDBACK SERVICE] Calling LLM...`);

    try {
      const llmResponse = await llmClient(prompt);
      console.log(`🔍 [FEEDBACK SERVICE] LLM response received`);
      
      const review = this.parseReviewResponse(llmResponse, request);
      console.log(`🔍 [FEEDBACK SERVICE] Review parsed successfully`);
      console.log(`   - Issues: ${review.issues.length}`);
      console.log(`   - Best practices: ${review.bestPractices.length}`);
      
      return review;
    } catch (error) {
      console.error("❌ [FEEDBACK SERVICE] LLM call failed:", error);
      console.log("🔍 [FEEDBACK SERVICE] Using fallback review...");
      return this.createFallbackReview(request);
    }
  },
  

  buildReviewPrompt(request: ReviewRequest): string {
    const { analysis, prediction } = request;

    const functions = analysis.functions ?? [];
    const imports = analysis.imports ?? [];
    const warnings = analysis.warnings ?? [];
    const similarPatterns = analysis.similarPatterns ?? [];

    const potentialIssues = analysis.mernPatterns?.potentialIssues ?? [];

    const directDeps = analysis.dependencies?.directDependencies ?? [];
    const reverseDeps = analysis.dependencies?.reverseDependencies ?? [];
    const impactAffects = analysis.dependencies?.impactRadius?.affects ?? [];
    const impactImpactedBy = analysis.dependencies?.impactRadius?.impactedBy ?? [];


    // Build comprehensive context from analysis
    const asyncInfo = analysis.mernPatterns.hasAsyncFunctions 
      ? `${analysis.mernPatterns.asyncFunctionCount} async functions detected`
      : 'No async functions';

    const expressInfo = analysis.mernPatterns.usesExpress
      ? `Express: ${analysis.mernPatterns.usesRouterModules ? 'Uses Router modules' : 'Direct app usage'}, ${analysis.mernPatterns.hasCentralizedErrorMiddleware ? 'Has' : 'Missing'} centralized error middleware, ${analysis.mernPatterns.usesStatusCodesCorrectly ? 'Correct' : 'Incorrect'} status codes`
      : 'Not using Express';

    const dbInfo = analysis.mernPatterns.usesMongoose
      ? `Mongoose: ${analysis.mernPatterns.hasSchemaValidation ? 'Has' : 'Missing'} schema validation, ${analysis.mernPatterns.hasIndexesDefined ? 'Has' : 'Missing'} indexes, ${analysis.mernPatterns.usesLeanQueries ? 'Uses' : 'Not using'} lean queries`
      : analysis.mernPatterns.usesMongoDB
      ? 'Using MongoDB (not Mongoose)'
      : 'No database detected';

    const validationInfo = `Request body validation: ${analysis.mernPatterns.validatesRequestBody ? 'Yes' : 'No'}, Query params validation: ${analysis.mernPatterns.validatesQueryParams ? 'Yes' : 'No'}`;

    const promiseInfo = analysis.mernPatterns.hasPromises
      ? `Promises detected, ${analysis.mernPatterns.hasUnhandledPromises ? 'UNHANDLED promises found' : 'properly handled'}`
      : 'No promises';

    return `You are an expert code reviewer specializing in MERN stack applications. Analyze this code and provide specific, actionable review.

# FILE ANALYSIS
File: ${analysis.fileId}
Timestamp: ${analysis.timestamp}

## Code Metrics
- Total Lines: ${analysis.metrics.totalLines}
- Functions: ${analysis.metrics.functionCount}
- Imports: ${analysis.metrics.importCount}
- Avg Function Length: ${analysis.metrics.avgFunctionLength} lines
- Cyclomatic Complexity: ${analysis.metrics.cyclomaticComplexity}

## Functions Found
${(functions?.length ?? 0) > 0 ? functions.map((fn, i) => `${i + 1}. ${fn.substring(0, 100)}...`).join('\n') : 'No functions detected'}

## Imports
${(imports?.length ?? 0) > 0 ? imports.join('\n') : 'No imports'}

## Dependencies
- Direct Dependencies: ${directDeps.length} (${directDeps.slice(0, 5).join(', ')}${directDeps.length > 5 ? '...' : ''})
- Reverse Dependencies: ${reverseDeps.length}
- Has Circular Dependencies: ${analysis.dependencies.hasCycles ? 'YES ⚠️' : 'No'}
- Impact Radius: Affects ${impactAffects.length} files, Impacted by ${impactImpactedBy.length} files

## MERN Patterns Analysis

### Error Handling
- Has Error Handling: ${analysis.mernPatterns.hasErrorHandling ? 'Yes ✓' : 'No ✗'}
- ${asyncInfo}
- ${promiseInfo}

### Express Patterns
${expressInfo}

### Database Patterns
${dbInfo}

### Validation
- Has Validation Library: ${analysis.mernPatterns.hasValidation ? 'Yes ✓' : 'No ✗'}
- ${validationInfo}

### Detected Issues (${potentialIssues.length})
${potentialIssues.length > 0 
  ? potentialIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')
  : 'No specific issues detected'}

## Similar Code Patterns
${(similarPatterns?.length ?? 0) > 0
  ? similarPatterns.map(p => `- ${p.id} (similarity: ${Math.round(p.score * 100)}%)`).join('\n')
  : 'No similar patterns found'}

## ML Prediction
- Will Fail: ${prediction.will_fail ? 'YES ⚠️' : 'No'}
- Failure Probability: ${(prediction.failure_probability * 100).toFixed(1)}%
- Confidence: ${prediction.confidence}
${prediction.reasoning ? `- Reasoning: ${prediction.reasoning}` : '- No specific reasoning provided'}

## Prediction Features
- Module Type: ${analysis.predictionFeatures?.module_type ?? 'unknown'}
- Developer: ${analysis.predictionFeatures?.developer ?? 'unknown'}
- Lines Added: ${analysis.predictionFeatures?.lines_added ?? 0}
- Lines Deleted: ${analysis.predictionFeatures?.lines_deleted ?? 0}
- Files Changed: ${analysis.predictionFeatures?.files_changed ?? 0}
- Avg Function Complexity: ${analysis.predictionFeatures?.avg_function_complexity ?? 0}
- Contains Test Changes: ${analysis.predictionFeatures?.contains_test_changes ? 'Yes' : 'No'}
- Previous Failure Rate: ${((analysis.predictionFeatures?.previous_failure_rate ?? 0) * 100).toFixed(1)}%

## Analysis Warnings
${(warnings?.length ?? 0) > 0 
  ? warnings.map((w, i) => `${i + 1}. ${w}`).join('\n')
  : 'No warnings'}

# INSTRUCTIONS

1. **Be Specific**: Reference actual metrics, function names, import statements, and patterns from the analysis above
2. **Critical Issues**: Only include issues that will cause runtime failures or security vulnerabilities
3. **Best Practices**: Focus on improvements based on actual code characteristics
4. **Use Context**: Incorporate information from similar code patterns, dependencies, and prediction features
5. **File-Specific**: Always mention "${analysis.fileId}" when describing fixes
6. **Severity Mapping**:
   - critical: Security vulnerabilities, unhandled promises causing crashes, injection risks
   - high: Missing error handling in async code, missing validation on user input
   - medium: Missing status codes, console.log usage, moderate complexity
   - low: Code style issues, minor improvements

# OUTPUT FORMAT

Return ONLY valid JSON in this exact format:

{
  "summary": "Brief summary incorporating actual metrics and prediction results",
  "riskLevel": "${this.determineRiskLevel(prediction.failure_probability, analysis.metrics.cyclomaticComplexity, analysis.mernPatterns)}",
  "shouldMerge": ${this.shouldMerge(prediction.failure_probability, analysis.metrics.cyclomaticComplexity, analysis.mernPatterns)},
  "issues": [
    ${this.buildIssuesTemplate(analysis, prediction)}
  ],
  "bestPractices": [
    ${this.buildBestPracticesTemplate(analysis)}
  ],
  "recommendations": [
    ${this.buildRecommendationsTemplate(analysis, prediction)}
  ],
  "codeQuality": {
    "score": ${this.calculateQualityScore(analysis)},
    "strengths": [${this.buildStrengthsTemplate(analysis)}],
    "improvementAreas": [${this.buildImprovementsTemplate(analysis)}]
  }
}

CRITICAL: Return ONLY the JSON object. No markdown, no additional text.`;
  },

  buildIssuesTemplate(analysis: CodeAnalysisResult, prediction: any): string {
    const issues: string[] = [];

    // Critical: Prediction failure
    if (prediction.will_fail && prediction.reasoning) {
      issues.push(`{
        "severity": "critical",
        "category": "predicted_failure",
        "title": "ML Model Predicts Failure",
        "description": "${prediction.reasoning.replace(/"/g, "'")}",
        "location": "${analysis.fileId}",
        "impact": "High risk of runtime failure or test failures based on code patterns",
        "suggestion": "${this.buildIssueSuggestion(prediction.reasoning, analysis)}",
        "resources": []
      }`);
    }

    // Critical: Unhandled promises
    if (analysis.mernPatterns.hasUnhandledPromises) {
      issues.push(`{
        "severity": "critical",
        "category": "error_handling",
        "title": "Unhandled Promise Rejections",
        "description": "Found ${analysis.mernPatterns.asyncFunctionCount} async functions with promises that lack proper error handling",
        "location": "${analysis.fileId}",
        "impact": "Unhandled promise rejections will crash the Node.js process",
        "suggestion": "Wrap all async operations in try-catch blocks or add .catch() handlers to promises in ${analysis.fileId}",
        "resources": ["https://nodejs.org/api/process.html#event-unhandledrejection"]
      }`);
    }

    // High: Missing error handling in async code
    if (!analysis.mernPatterns.hasErrorHandling && analysis.mernPatterns.hasAsyncFunctions && analysis.mernPatterns.asyncFunctionCount > 0) {
      issues.push(`{
        "severity": "high",
        "category": "error_handling",
        "title": "Missing Error Handling in Async Functions",
        "description": "Detected ${analysis.mernPatterns.asyncFunctionCount} async functions without try-catch error handling",
        "location": "${analysis.fileId}",
        "impact": "Errors in async operations will not be caught, causing request failures",
        "suggestion": "Add try-catch blocks to all async functions in ${analysis.fileId}",
        "resources": ["https://expressjs.com/en/guide/error-handling.html"]
      }`);
    }

    // High: Security issues from potential patterns
    const potentialIssues = analysis.mernPatterns?.potentialIssues ?? [];
    const securityIssues = potentialIssues.filter(
      issue => issue.toLowerCase().includes('injection') || issue.toLowerCase().includes('credentials')
    );
    
    securityIssues.forEach(issue => {
      issues.push(`{
        "severity": "high",
        "category": "security",
        "title": "${issue}",
        "description": "${issue} detected in ${analysis.fileId}",
        "location": "${analysis.fileId}",
        "impact": "Security vulnerability that could lead to data breaches or unauthorized access",
        "suggestion": "${this.buildSecuritySuggestion(issue, analysis.fileId)}",
        "resources": ["https://owasp.org/"]
      }`);
    });

    return issues.join(',\n    ');
  },

  buildBestPracticesTemplate(analysis: CodeAnalysisResult): string {
    const practices: string[] = [];
    const functions = analysis.functions ?? [];
    const potentialIssues = analysis.mernPatterns?.potentialIssues ?? [];

    // Validation
    if (!analysis.mernPatterns.hasValidation) {
      practices.push(`{
        "category": "Validation",
        "priority": "high",
        "title": "Implement Input Validation",
        "currentState": "No validation library detected (Joi, Zod, express-validator)",
        "recommendedState": "All user inputs should be validated before processing",
        "benefits": "Prevents invalid data, reduces bugs, improves security",
        "implementation": {
          "steps": [
            "Install validation library: npm install joi or zod",
            "Create validation schemas for request bodies and query params",
            "Add validation middleware to Express routes",
            "Return 400 with clear error messages for validation failures"
          ],
          "codeExample": "const schema = Joi.object({ email: Joi.string().email().required() });\\nconst { error, value } = schema.validate(req.body);\\nif (error) return res.status(400).json({ error: error.message });"
        },
        "resources": ["https://joi.dev/", "https://github.com/colinhacks/zod"]
      }`);
    }

    // Specific validation issues
    if (!analysis.mernPatterns.validatesRequestBody && /req\.body/.test(functions.join(' '))) {
      practices.push(`{
        "category": "Validation",
        "priority": "high",
        "title": "Validate Request Body Parameters",
        "currentState": "Using req.body without validation in ${analysis.fileId}",
        "recommendedState": "All req.body fields should be validated",
        "benefits": "Prevents type errors, invalid data, and security issues",
        "implementation": {
          "steps": [
            "Identify all req.body access points in ${analysis.fileId}",
            "Define validation schema for expected fields",
            "Validate before any business logic"
          ]
        },
        "resources": []
      }`);
    }

    // Express patterns
    if (analysis.mernPatterns.usesExpress && !analysis.mernPatterns.hasCentralizedErrorMiddleware) {
      practices.push(`{
        "category": "Express",
        "priority": "medium",
        "title": "Implement Centralized Error Handling Middleware",
        "currentState": "No centralized error middleware detected",
        "recommendedState": "Use Express error handling middleware for consistent error responses",
        "benefits": "Consistent error format, easier debugging, cleaner code",
        "implementation": {
          "steps": [
            "Create error handler middleware: app.use((err, req, res, next) => {...})",
            "Place it after all routes",
            "Pass errors to next(error) from route handlers",
            "Format errors consistently"
          ],
          "codeExample": "app.use((err, req, res, next) => {\\n  console.error(err.stack);\\n  res.status(err.status || 500).json({\\n    error: err.message,\\n    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })\\n  });\\n});"
        },
        "resources": ["https://expressjs.com/en/guide/error-handling.html"]
      }`);
    }

    if (analysis.mernPatterns.usesExpress && !analysis.mernPatterns.usesStatusCodesCorrectly) {
      practices.push(`{
        "category": "Express",
        "priority": "medium",
        "title": "Use Explicit HTTP Status Codes",
        "currentState": "Some responses in ${analysis.fileId} lack explicit status codes",
        "recommendedState": "All responses should include appropriate HTTP status codes",
        "benefits": "Clear API contracts, better client error handling",
        "implementation": {
          "steps": [
            "Review all res.json() and res.send() calls",
            "Add res.status(code) before sending response",
            "Use standard codes: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found), 500 (Error)"
          ]
        },
        "resources": []
      }`);
    }

    // Mongoose patterns
    if (analysis.mernPatterns.usesMongoose && !analysis.mernPatterns.hasSchemaValidation) {
      practices.push(`{
        "category": "Database",
        "priority": "medium",
        "title": "Add Mongoose Schema Validation",
        "currentState": "Mongoose schemas in ${analysis.fileId} lack validation rules",
        "recommendedState": "All schemas should have appropriate validators",
        "benefits": "Data integrity, prevents invalid documents, clear error messages",
        "implementation": {
          "steps": [
            "Add required, min, max, enum validators to schema fields",
            "Use custom validators for complex rules",
            "Enable schema validation on updates"
          ],
          "codeExample": "const userSchema = new Schema({\\n  email: { type: String, required: true, unique: true, lowercase: true },\\n  age: { type: Number, min: 18, max: 120 }\\n});"
        },
        "resources": ["https://mongoosejs.com/docs/validation.html"]
      }`);
    }

    if (analysis.mernPatterns.usesMongoose && !analysis.mernPatterns.hasIndexesDefined) {
      practices.push(`{
        "category": "Database",
        "priority": "medium",
        "title": "Define Database Indexes",
        "currentState": "No indexes detected in Mongoose schemas",
        "recommendedState": "Add indexes on frequently queried fields",
        "benefits": "Significantly improves query performance",
        "implementation": {
          "steps": [
            "Identify frequently queried fields",
            "Add index: { field: 1 } in schema",
            "Use compound indexes for multi-field queries",
            "Monitor index usage with explain()"
          ]
        },
        "resources": []
      }`);
    }

    // Complexity
    if (analysis.metrics.cyclomaticComplexity > 15) {
      practices.push(`{
        "category": "Code Quality",
        "priority": "${analysis.metrics.cyclomaticComplexity > 20 ? 'high' : 'medium'}",
        "title": "Reduce Cyclomatic Complexity",
        "currentState": "Complexity of ${analysis.metrics.cyclomaticComplexity} exceeds recommended threshold of 10-15",
        "recommendedState": "Break down complex functions into smaller, focused units",
        "benefits": "Easier testing, better maintainability, fewer bugs",
        "implementation": {
          "steps": [
            "Extract complex conditionals into separate functions",
            "Use early returns to reduce nesting",
            "Apply Single Responsibility Principle",
            "Consider Strategy or Command patterns for complex logic"
          ]
        },
        "resources": []
      }`);
    }

    // Circular dependencies
    if (analysis.dependencies.hasCycles) {
      practices.push(`{
        "category": "Architecture",
        "priority": "medium",
        "title": "Resolve Circular Dependencies",
        "currentState": "Circular dependencies detected in module imports",
        "recommendedState": "Clean, acyclic dependency graph",
        "benefits": "Prevents import order issues, better tree-shaking",
        "implementation": {
          "steps": [
            "Extract shared code into separate modules",
            "Use dependency injection to break cycles",
            "Restructure into layered architecture"
          ]
        },
        "resources": []
      }`);
    }

    // Console.log usage
    if (potentialIssues.some(i => i.includes('console.log'))) {
      practices.push(`{
        "category": "Logging",
        "priority": "low",
        "title": "Replace console.log with Proper Logger",
        "currentState": "Using console.log in ${analysis.fileId}",
        "recommendedState": "Use structured logging library (Winston, Pino)",
        "benefits": "Better log management, log levels, production-ready",
        "implementation": {
          "steps": [
            "Install Winston or Pino",
            "Create logger configuration",
            "Replace console.log with logger.info/error/warn"
          ]
        },
        "resources": []
      }`);
    }

    return practices.join(',\n    ');
  },


  buildRecommendationsTemplate(analysis: CodeAnalysisResult, prediction: any): string {
    const recs: string[] = [];

    if (prediction.will_fail) {
      recs.push(`"⚠️ CRITICAL: ML predicts failure - ${prediction.reasoning || 'review code carefully'}"`);
    }

    const potentialIssues = analysis.mernPatterns?.potentialIssues ?? [];
if (potentialIssues.length > 0) {
  recs.push(`"🎯 PRIORITY: Address ${potentialIssues.length} detected issue${potentialIssues.length !== 1 ? 's' : ''}"`);
}

    if (!analysis.mernPatterns.hasErrorHandling && analysis.mernPatterns.hasAsyncFunctions && analysis.mernPatterns.asyncFunctionCount > 0) {
      recs.push(`"🎯 PRIORITY: Add error handling to ${analysis.mernPatterns.asyncFunctionCount} async function${analysis.mernPatterns.asyncFunctionCount !== 1 ? 's' : ''}"`);
    }

    if (!analysis.mernPatterns.hasValidation) {
      recs.push(`"🎯 PRIORITY: Implement input validation before deployment"`);
    }

    if (analysis.metrics.cyclomaticComplexity > 15) {
      recs.push(`"💡 SUGGESTION: Refactor to reduce complexity from ${analysis.metrics.cyclomaticComplexity} to <15"`);
    }

    recs.push(`"✅ Ensure test coverage for ${analysis.fileId} before merging"`);

    return recs.join(',\n    ');
  },

  buildStrengthsTemplate(analysis: CodeAnalysisResult): string {
    const strengths: string[] = [];

    if (analysis.mernPatterns.hasErrorHandling) {
      strengths.push(`"Implements error handling with try-catch in async functions"`);
    }

    if (analysis.mernPatterns.hasValidation) {
      strengths.push(`"Uses input validation library (Joi/Zod/express-validator)"`);
    }

    if (analysis.metrics.cyclomaticComplexity < 10) {
      strengths.push(`"Low complexity (${analysis.metrics.cyclomaticComplexity}) - maintainable code"`);
    }

    if (!analysis.dependencies.hasCycles) {
      strengths.push(`"Clean dependency structure with no circular imports"`);
    }

    if (analysis.mernPatterns.usesExpress && analysis.mernPatterns.usesRouterModules) {
      strengths.push(`"Well-organized Express routes using Router modules"`);
    }

    if (analysis.mernPatterns.usesMongoose && analysis.mernPatterns.hasSchemaValidation) {
      strengths.push(`"Mongoose schemas include validation rules"`);
    }

    if (analysis.mernPatterns.usesStatusCodesCorrectly) {
      strengths.push(`"Proper HTTP status code usage in responses"`);
    }

    if (strengths.length === 0) {
      strengths.push(`"Follows basic MERN stack conventions"`);
    }

    return strengths.join(',\n      ');
  },

  buildImprovementsTemplate(analysis: CodeAnalysisResult): string {
    const improvements: string[] = [];

    if (!analysis.mernPatterns.hasErrorHandling) {
      improvements.push(`"Error Handling: Add try-catch to ${analysis.mernPatterns.asyncFunctionCount} async functions"`);
    }

    if (!analysis.mernPatterns.hasValidation) {
      improvements.push(`"Validation: Implement input validation with Joi or Zod"`);
    }

    if (analysis.metrics.cyclomaticComplexity > 15) {
      improvements.push(`"Complexity: Reduce from ${analysis.metrics.cyclomaticComplexity} to <15"`);
    }

    if (analysis.dependencies.hasCycles) {
      improvements.push(`"Architecture: Resolve circular dependencies"`);
    }

    if (analysis.mernPatterns.usesExpress && !analysis.mernPatterns.hasCentralizedErrorMiddleware) {
      improvements.push(`"Express: Add centralized error handling middleware"`);
    }

    if (analysis.mernPatterns.usesMongoose && !analysis.mernPatterns.hasIndexesDefined) {
      improvements.push(`"Database: Define indexes on frequently queried fields"`);
    }

    if (improvements.length === 0) {
      improvements.push(`"Testing: Add more test coverage"`);
    }

    return improvements.join(',\n      ');
  },

  determineRiskLevel(
    failureProbability: number,
    complexity: number,
    mernPatterns: any
  ): "critical" | "high" | "medium" | "low" {
    // Critical: High failure probability OR unhandled promises
    if (failureProbability > 0.7 || mernPatterns.hasUnhandledPromises) {
      return "critical";
    }
    const potentialIssues = mernPatterns?.potentialIssues ?? [];
    // High: Medium-high failure probability OR missing critical patterns
    if (
      failureProbability > 0.5 ||
      (!mernPatterns.hasErrorHandling && mernPatterns.hasAsyncFunctions) ||
      potentialIssues.some((i: string) =>
        i.toLowerCase().includes('injection') || i.toLowerCase().includes('credentials')
      )
    ) {
      return "high";
    }

    // Medium: Moderate failure probability OR high complexity OR missing validation
    if (
      failureProbability > 0.3 ||
      complexity > 15 ||
      !mernPatterns.hasValidation
    ) {
      return "medium";
    }

    return "low";
  },

  shouldMerge(
    failureProbability: number,
    complexity: number,
    mernPatterns: any
  ): boolean {
    const riskLevel = this.determineRiskLevel(failureProbability, complexity, mernPatterns);
    return riskLevel === "low" || riskLevel === "medium";
  },

  calculateQualityScore(analysis: CodeAnalysisResult): number {
    let score = 100;

    // Complexity penalty
    if (analysis.metrics.cyclomaticComplexity > 20) score -= 30;
    else if (analysis.metrics.cyclomaticComplexity > 15) score -= 20;
    else if (analysis.metrics.cyclomaticComplexity > 10) score -= 10;

    // Error handling penalty
    if (!analysis.mernPatterns.hasErrorHandling && analysis.mernPatterns.hasAsyncFunctions) {
      score -= 25;
    }
    if (analysis.mernPatterns.hasUnhandledPromises) score -= 30;

    // Validation penalty
    if (!analysis.mernPatterns.hasValidation) score -= 15;
    if (!analysis.mernPatterns.validatesRequestBody) score -= 10;

    // Pattern issues penalty
    const potentialIssues = analysis.mernPatterns?.potentialIssues ?? [];
    const securityIssues = potentialIssues.filter(
      issue => issue.toLowerCase().includes('injection') || issue.toLowerCase().includes('credentials')
    );
    score -= (potentialIssues.length - securityIssues.length) * 5;

    // Dependency issues
    if (analysis.dependencies.hasCycles) score -= 15;

    // Express patterns bonus
    if (analysis.mernPatterns.usesExpress) {
      if (analysis.mernPatterns.usesRouterModules) score += 5;
      if (analysis.mernPatterns.hasCentralizedErrorMiddleware) score += 5;
      if (analysis.mernPatterns.usesStatusCodesCorrectly) score += 3;
    }

    // Database patterns bonus
    if (analysis.mernPatterns.usesMongoose) {
      if (analysis.mernPatterns.hasSchemaValidation) score += 5;
      if (analysis.mernPatterns.hasIndexesDefined) score += 3;
    }

    return Math.max(0, Math.min(100, score));
  },

  parseReviewResponse(llmResponse: string, request: ReviewRequest): ReviewResponse {
    console.log('🔍 [FEEDBACK SERVICE] Parsing LLM response...');

    try {
      const cleaned = llmResponse.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      console.log('🔍 [FEEDBACK SERVICE] JSON parsed successfully');

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
      console.error("❌ [FEEDBACK SERVICE] Failed to parse LLM response:", error);
      console.log('🔍 [FEEDBACK SERVICE] Using fallback review...');
      return this.createFallbackReview(request);
    }
  },

  createFallbackReview(request: ReviewRequest): ReviewResponse {
    console.log('🔍 [FEEDBACK SERVICE] ===== CREATING FALLBACK FEEDBACK =====');

    const { analysis, prediction } = request;
    const issues: ReviewIssue[] = [];
    const bestPractices: BestPractice[] = [];

    // Check if this is a documentation/config file (low-risk changes)
    const isDocFile = /\.(md|txt|json|ya?ml|gitignore|env\.example)$/i.test(analysis.fileId);
    const isReadme = /readme/i.test(analysis.fileId);
    const isConfigFile = /package\.json|tsconfig|\.config\./i.test(analysis.fileId);

    // Critical issues from prediction
    if (prediction.will_fail && prediction.reasoning) {
      issues.push({
        severity: "critical",
        category: "predicted_failure",
        title: "ML Model Predicts Failure",
        description: `ML analysis indicates potential failure: ${prediction.reasoning}`,
        location: analysis.fileId,
        impact: "High risk of runtime failure or test failures",
        suggestion: this.buildIssueSuggestion(prediction.reasoning, analysis)
      });
    }

    // Critical: Unhandled promises
    if (analysis.mernPatterns.hasUnhandledPromises) {
      issues.push({
        severity: "critical",
        category: "error_handling",
        title: "Unhandled Promise Rejections Detected",
        description: `Found ${analysis.mernPatterns.asyncFunctionCount} async functions with promises that lack proper error handling in ${analysis.fileId}`,
        location: analysis.fileId,
        impact: "Unhandled promise rejections will crash the Node.js process in production",
        suggestion: `Add try-catch blocks or .catch() handlers to all promise-based operations in ${analysis.fileId}`,
        resources: ["https://nodejs.org/api/process.html#event-unhandledrejection"]
      });
    }

    // High: Missing error handling
    if (!analysis.mernPatterns.hasErrorHandling && analysis.mernPatterns.hasAsyncFunctions && analysis.mernPatterns.asyncFunctionCount > 0) {
      issues.push({
        severity: "high",
        category: "error_handling",
        title: "Missing Error Handling in Async Functions",
        description: `${analysis.mernPatterns.asyncFunctionCount} async functions in ${analysis.fileId} lack try-catch error handling`,
        location: analysis.fileId,
        impact: "Errors in async operations will not be caught, causing request failures and poor user experience",
        suggestion: `Wrap all async operations in ${analysis.fileId} with try-catch blocks and return appropriate error responses`,
        resources: ["https://expressjs.com/en/guide/error-handling.html"]
      });
    }

    // Security issues
    const potentialIssues = analysis.mernPatterns?.potentialIssues ?? [];
    const securityIssues = potentialIssues.filter(
      issue => issue.toLowerCase().includes('injection') || issue.toLowerCase().includes('credentials')
    );

    securityIssues.forEach(issue => {
      issues.push({
        severity: "high",
        category: "security",
        title: issue,
        description: `Security vulnerability detected in ${analysis.fileId}: ${issue}`,
        location: analysis.fileId,
        impact: "Could lead to data breaches, unauthorized access, or system compromise",
        suggestion: this.buildSecuritySuggestion(issue, analysis.fileId),
        resources: ["https://owasp.org/www-community/"]
      });
    });

    // Build best practices from analysis
    bestPractices.push(...this.generateBestPractices(analysis));

    const riskLevel = this.determineRiskLevel(
      prediction.failure_probability,
      analysis.metrics.cyclomaticComplexity,
      analysis.mernPatterns
    );

    // Build appropriate summary based on file type
    let summary: string;
    if (isReadme) {
      summary = `README update for ${analysis.fileId} looks good. Documentation changes are low-risk and help improve project clarity. ${issues.length > 0 ? `Note: ${issues.length} suggestion${issues.length !== 1 ? 's' : ''} for improvement.` : 'No issues detected.'}`;
    } else if (isConfigFile) {
      summary = `Configuration file ${analysis.fileId} updated. ${issues.length > 0 ? `⚠️ ${issues.length} issue${issues.length !== 1 ? 's' : ''} detected - review carefully as config changes can affect runtime behavior.` : 'Changes look safe. Verify configuration values in your environment.'}`;
    } else if (isDocFile) {
      summary = `Documentation/config file ${analysis.fileId} updated. Low-risk changes. ${issues.length > 0 ? `${issues.length} improvement${issues.length !== 1 ? 's' : ''} suggested.` : 'No issues found.'}`;
    } else {
      summary = `Analysis of ${analysis.fileId} (${analysis.metrics.totalLines} lines, ${analysis.metrics.functionCount} functions, complexity: ${analysis.metrics.cyclomaticComplexity}). ${prediction.will_fail ? '⚠️ ML predicts FAILURE' : '✓ ML predicts SUCCESS'} (${(prediction.failure_probability * 100).toFixed(1)}% failure probability). ${issues.length} critical issue${issues.length !== 1 ? 's' : ''} found. ${bestPractices.length} improvement${bestPractices.length !== 1 ? 's' : ''} recommended. Quality score: ${this.calculateQualityScore(analysis)}/100.`;
    }

    console.log('🔍 [FEEDBACK SERVICE] Fallback complete - Issues:', issues.length, 'Best Practices:', bestPractices.length);

    return {
      summary,
      riskLevel,
      shouldMerge: this.shouldMerge(
        prediction.failure_probability,
        analysis.metrics.cyclomaticComplexity,
        analysis.mernPatterns
      ),
      issues,
      bestPractices,
      recommendations: this.generateRecommendations(
          analysis,
          prediction,
          issues,
          bestPractices,
          request.context
        ),

      codeQuality: {
        score: this.calculateQualityScore(analysis),
        strengths: this.identifyStrengths(analysis),
        improvementAreas: this.identifyImprovements(analysis, bestPractices)
      },
      generatedAt: new Date().toISOString()
    };
  },

  buildIssueSuggestion(reasoning: string, analysis: CodeAnalysisResult): string {
    const fileHint = ` in ${analysis.fileId}`;
    const sanitized = reasoning.replace(/"/g, "'");

    // Extract specific identifiers
    const identifier = this.extractIdentifier(sanitized) || 
                      this.extractIdentifier(analysis.mernPatterns.potentialIssues.join(" "));

    // Pattern matching for specific issues
    const undefinedMatch = sanitized.match(/undefined (?:variable|property|function)\s+([A-Za-z0-9_.]+)/i);
    if (undefinedMatch?.[1]) {
      return `Define or import "${undefinedMatch[1]}"${fileHint}, or add checks to handle undefined values before use`;
    }

    const missingMatch = sanitized.match(/missing (?:regex|pattern|field|property|validation)\s+([A-Za-z0-9_.]+)/i);
    if (missingMatch?.[1]) {
      return `Add or correct the "${missingMatch[1]}" pattern${fileHint} to ensure code executes safely`;
    }

    const logicMatch = sanitized.match(/(?:logic|condition)\s+issue\s+with\s+([A-Za-z0-9_.]+)/i);
    if (logicMatch?.[1]) {
      return `Review and fix the logic around "${logicMatch[1]}"${fileHint} to match intended behavior`;
    }

    if (identifier) {
      return `Focus on "${identifier}"${fileHint}: ensure it is properly defined, validated, and used according to its intended purpose`;
    }

    return `Address the issue${fileHint}: ${sanitized}. Review the code carefully and add appropriate error handling, validation, or logic fixes`;
  },

  extractIdentifier(text: string): string | undefined {
    if (!text) return undefined;

    // Check for backtick-wrapped identifiers
    const tickMatch = text.match(/`([A-Za-z0-9_.-]+)`/);
    if (tickMatch?.[1]) return tickMatch[1];

    // Check for quoted identifiers
    const quoteMatch = text.match(/["']([A-Za-z0-9_.-]+)["']/);
    if (quoteMatch?.[1]) return quoteMatch[1];

    // Check for identifiers after keywords
    const keywordMatch = text.match(/\b(?:variable|property|field|param|function|method)\s+([A-Za-z0-9_.-]+)/i);
    if (keywordMatch?.[1]) return keywordMatch[1];

    return undefined;
  },

  buildSecuritySuggestion(issue: string, fileId: string): string {
    const lowerIssue = issue.toLowerCase();

    if (lowerIssue.includes('injection')) {
      return `Use parameterized queries or ORM methods in ${fileId}. Never concatenate user input directly into database queries. If using MongoDB, use Mongoose methods; if using SQL, use prepared statements with parameter binding`;
    }

    if (lowerIssue.includes('credentials') || lowerIssue.includes('hardcoded')) {
      return `Move all sensitive credentials from ${fileId} to environment variables. Use a .env file with libraries like dotenv, and never commit sensitive data to version control. Add .env to .gitignore`;
    }

    return `Review and fix the security issue in ${fileId}: ${issue}. Consult OWASP guidelines for best practices`;
  },

  generateBestPractices(analysis: CodeAnalysisResult): BestPractice[] {
    const practices: BestPractice[] = [];

    // Validation
    if (!analysis.mernPatterns.hasValidation) {
      practices.push({
        category: "Validation",
        priority: "high",
        title: "Implement Input Validation",
        currentState: "No validation library detected (Joi, Zod, express-validator)",
        recommendedState: "All user inputs should be validated before processing",
        benefits: "Prevents invalid data, reduces bugs, improves security, provides clear error messages",
        implementation: {
          steps: [
            "Choose and install a validation library: npm install joi or zod",
            "Create validation schemas for all request bodies and query parameters",
            "Add validation middleware to Express routes before business logic",
            "Return 400 Bad Request with descriptive error messages on validation failures"
          ],
          codeExample: `const Joi = require('joi');

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
    return res.status(400).json({ error: error.message });
  }
});`
        },
        resources: ["https://joi.dev/api/", "https://github.com/colinhacks/zod"]
      });
    }

    // Request body validation
    if (!analysis.mernPatterns.validatesRequestBody && /req\.body/.test(analysis.functions.join(' '))) {
      practices.push({
        category: "Validation",
        priority: "high",
        title: "Validate Request Body Parameters",
        currentState: `Using req.body without validation in ${analysis.fileId}`,
        recommendedState: "All req.body fields should be validated for type, format, and constraints",
        benefits: "Prevents type errors, invalid data reaching business logic, and potential security vulnerabilities",
        implementation: {
          steps: [
            `Identify all req.body access points in ${analysis.fileId}`,
            "Define expected field types and constraints",
            "Validate before any database operations or business logic"
          ]
        },
        resources: []
      });
    }

    // Express error middleware
    if (analysis.mernPatterns.usesExpress && !analysis.mernPatterns.hasCentralizedErrorMiddleware) {
      practices.push({
        category: "Express",
        priority: "medium",
        title: "Implement Centralized Error Handling Middleware",
        currentState: "No centralized error middleware detected",
        recommendedState: "Use Express error handling middleware for consistent error responses",
        benefits: "Consistent error format, easier debugging, prevents error details leaking in production",
        implementation: {
          steps: [
            "Create error handler middleware with 4 parameters: (err, req, res, next)",
            "Place it after all routes in your Express app",
            "Pass errors using next(error) from route handlers",
            "Format errors consistently and log them appropriately"
          ],
          codeExample: `app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});`
        },
        resources: ["https://expressjs.com/en/guide/error-handling.html"]
      });
    }

    // Status codes
    if (analysis.mernPatterns.usesExpress && !analysis.mernPatterns.usesStatusCodesCorrectly) {
      practices.push({
        category: "Express",
        priority: "medium",
        title: "Use Explicit HTTP Status Codes",
        currentState: `Some responses in ${analysis.fileId} lack explicit status codes`,
        recommendedState: "All API responses should include appropriate HTTP status codes",
        benefits: "Clear API contracts, better client-side error handling, REST compliance",
        implementation: {
          steps: [
            "Review all res.json() and res.send() calls",
            "Add res.status(code) before sending response",
            "Use: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found), 500 (Server Error)"
          ]
        },
        resources: ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Status"]
      });
    }

    // Mongoose schema validation
    if (analysis.mernPatterns.usesMongoose && !analysis.mernPatterns.hasSchemaValidation) {
      practices.push({
        category: "Database",
        priority: "medium",
        title: "Add Mongoose Schema Validation",
        currentState: `Mongoose schemas in ${analysis.fileId} lack validation rules`,
        recommendedState: "All schemas should have appropriate validators for data integrity",
        benefits: "Prevents invalid documents, ensures data quality, provides clear error messages",
        implementation: {
          steps: [
            "Add required, min, max, enum validators to schema fields",
            "Use custom validators for complex business rules",
            "Enable validation on updates with runValidators: true"
          ],
          codeExample: `const userSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: (v) => /^\\S+@\\S+\\.\\S+$/.test(v),
      message: 'Invalid email format'
    }
  },
  age: {
    type: Number,
    min: [18, 'Must be at least 18'],
    max: 120
  }
});`
        },
        resources: ["https://mongoosejs.com/docs/validation.html"]
      });
    }

    // Database indexes
    if (analysis.mernPatterns.usesMongoose && !analysis.mernPatterns.hasIndexesDefined) {
      practices.push({
        category: "Database",
        priority: "medium",
        title: "Define Database Indexes",
        currentState: "No indexes detected in Mongoose schemas",
        recommendedState: "Add indexes on frequently queried fields for performance",
        benefits: "Dramatically improves query performance, reduces database load",
        implementation: {
          steps: [
            "Identify fields used in find(), findOne(), or where() clauses",
            "Add single-field indexes: { field: 1 } in schema",
            "Use compound indexes for multi-field queries",
            "Monitor index usage with .explain()"
          ]
        },
        resources: ["https://mongoosejs.com/docs/guide.html#indexes"]
      });
    }

    // Complexity
    if (analysis.metrics.cyclomaticComplexity > 15) {
      practices.push({
        category: "Code Quality",
        priority: analysis.metrics.cyclomaticComplexity > 20 ? "high" : "medium",
        title: "Reduce Cyclomatic Complexity",
        currentState: `Complexity of ${analysis.metrics.cyclomaticComplexity} exceeds recommended threshold (10-15)`,
        recommendedState: "Break down complex functions into smaller, focused units",
        benefits: "Easier to test, understand, and maintain; fewer bugs; better reusability",
        implementation: {
          steps: [
            "Identify functions with high complexity",
            "Extract complex conditionals into separate, named functions",
            "Use early returns to reduce nesting depth",
            "Apply Single Responsibility Principle",
            "Consider using design patterns (Strategy, Command) for complex logic"
          ]
        },
        resources: ["https://en.wikipedia.org/wiki/Cyclomatic_complexity"]
      });
    }

    // Circular dependencies
    if (analysis.dependencies.hasCycles) {
      practices.push({
        category: "Architecture",
        priority: "medium",
        title: "Resolve Circular Dependencies",
        currentState: "Circular dependencies detected in module imports",
        recommendedState: "Clean, acyclic dependency graph with clear module hierarchy",
        benefits: "Prevents import order issues, enables better tree-shaking, improves code organization",
        implementation: {
          steps: [
            "Identify circular dependencies using dependency analysis",
            "Extract shared code into separate utility modules",
            "Use dependency injection to break cycles",
            "Restructure modules into layered architecture (controllers -> services -> data)"
          ]
        },
        resources: ["https://nodejs.org/api/modules.html#modules_cycles"]
      });
    }

    // Logging
    if (analysis.mernPatterns.potentialIssues.some(i => i.includes('console.log'))) {
      practices.push({
        category: "Logging",
        priority: "low",
        title: "Replace console.log with Proper Logger",
        currentState: `Using console.log for logging in ${analysis.fileId}`,
        recommendedState: "Use structured logging library (Winston, Pino, or Bunyan)",
        benefits: "Log levels, structured output, better performance, production-ready logging",
        implementation: {
          steps: [
            "Install Winston: npm install winston",
            "Create logger configuration with transports",
            "Replace all console.log with logger.info/error/warn",
            "Configure different log levels for environments"
          ]
        },
        resources: ["https://github.com/winstonjs/winston"]
      });
    }

    return practices;
  },

  generateRecommendations(
  analysis: CodeAnalysisResult,
  prediction: any,
  issues: ReviewIssue[],
  bestPractices: BestPractice[],
  context?: ReviewRequest["context"]
): string[] {

    const recs: string[] = [];

    // Check if this is a documentation/config file
    const isDocFile = /\.(md|txt|json|ya?ml|gitignore|env\.example)$/i.test(analysis.fileId);
    const isReadme = /readme/i.test(analysis.fileId);
    const isConfigFile = /package\.json|tsconfig|\.config\./i.test(analysis.fileId);

    // Special handling for documentation files
    if (isReadme && issues.length === 0 && !prediction.will_fail) {
      recs.push('✅ README documentation update - changes look good and help improve project clarity');
      recs.push('📝 Consider keeping documentation in sync with code changes');
      return recs;
    }

    if (isDocFile && issues.length === 0 && !prediction.will_fail) {
      recs.push('✅ Documentation/configuration file update approved - low risk changes');
      if (isConfigFile) {
        recs.push('⚙️ Verify configuration values work correctly in all environments');
      }
      return recs;
    }

    // Critical prediction
    if (prediction.will_fail) {
      recs.push(
        `⚠️ CRITICAL: ML model predicts failure with ${(prediction.failure_probability * 100).toFixed(1)}% probability - ${prediction.reasoning || 'review code carefully before merging'}`
      );
    }

    // Critical issues
    const criticalIssues = issues.filter(i => i.severity === "critical");
    if (criticalIssues.length > 0) {
      recs.push(
        `⚠️ CRITICAL: ${criticalIssues.length} critical issue${criticalIssues.length !== 1 ? 's' : ''} must be fixed before deployment`
      );
    }

    // High severity issues
    const highIssues = issues.filter(i => i.severity === "high");
    if (highIssues.length > 0) {
      recs.push(
        `🎯 PRIORITY: ${highIssues.length} high-severity issue${highIssues.length !== 1 ? 's' : ''} detected - address before merging`
      );
    }

    // High priority best practices
    const highPriorityBPs = bestPractices.filter(bp => bp.priority === "high");
    if (highPriorityBPs.length > 0) {
      recs.push(
        `🎯 PRIORITY: ${highPriorityBPs.length} important improvement${highPriorityBPs.length !== 1 ? 's' : ''} recommended: ${highPriorityBPs.map(bp => bp.category).join(', ')}`
      );
    }

    // Specific patterns
    if (!analysis.mernPatterns.hasErrorHandling && analysis.mernPatterns.hasAsyncFunctions && analysis.mernPatterns.asyncFunctionCount > 0) {
      recs.push(
        `🎯 PRIORITY: Add error handling to ${analysis.mernPatterns.asyncFunctionCount} async function${analysis.mernPatterns.asyncFunctionCount !== 1 ? 's' : ''} in ${analysis.fileId}`
      );
    }

    if (!analysis.mernPatterns.hasValidation) {
      recs.push(
        `🎯 PRIORITY: Implement input validation in ${analysis.fileId} before deployment`
      );
    }

    // Medium priority suggestions
    if (analysis.metrics.cyclomaticComplexity > 15) {
      recs.push(
        `💡 SUGGESTION: Refactor ${analysis.fileId} to reduce complexity from ${analysis.metrics.cyclomaticComplexity} to <15`
      );
    }

    // Testing reminder
    if (!isDocFile) {
      recs.push(
        `✅ Ensure adequate test coverage for ${analysis.fileId} before merging to ${context?.branch || 'main'}`
      );
    }

    // Positive review
    if (issues.length === 0 && !prediction.will_fail) {
      if (isDocFile) {
        recs.push('✅ Documentation changes approved - proceed with merge');
      } else {
        recs.push('✅ Code quality looks good - proceed with standard review process');
      }
    }

    return recs;
  },

  identifyStrengths(analysis: CodeAnalysisResult): string[] {
    const strengths: string[] = [];

    if (analysis.mernPatterns.hasErrorHandling) {
      strengths.push(`Implements error handling with try-catch in ${analysis.mernPatterns.asyncFunctionCount} async functions`);
    }

    if (analysis.mernPatterns.hasValidation) {
      strengths.push("Uses input validation library (Joi/Zod/express-validator)");
    }

    if (analysis.metrics.cyclomaticComplexity < 10) {
      strengths.push(`Low cyclomatic complexity (${analysis.metrics.cyclomaticComplexity}) indicates maintainable code`);
    }

    if (!analysis.dependencies.hasCycles) {
      strengths.push("Clean dependency structure with no circular imports");
    }

    if (analysis.mernPatterns.usesExpress && analysis.mernPatterns.usesRouterModules) {
      strengths.push("Well-organized Express routes using Router modules");
    }

    if (analysis.mernPatterns.usesExpress && analysis.mernPatterns.hasCentralizedErrorMiddleware) {
      strengths.push("Implements centralized error handling middleware");
    }

    if (analysis.mernPatterns.usesStatusCodesCorrectly) {
      strengths.push("Proper HTTP status code usage in API responses");
    }

    if (analysis.mernPatterns.usesMongoose && analysis.mernPatterns.hasSchemaValidation) {
      strengths.push("Mongoose schemas include validation rules");
    }

    if (analysis.mernPatterns.usesMongoose && analysis.mernPatterns.hasIndexesDefined) {
      strengths.push("Database indexes defined for performance optimization");
    }

    if (analysis.mernPatterns.validatesRequestBody) {
      strengths.push("Validates request body parameters before processing");
    }

    if (strengths.length === 0) {
      strengths.push("Follows basic MERN stack conventions");
    }

    return strengths;
  },

  identifyImprovements(analysis: CodeAnalysisResult, bestPractices: BestPractice[]): string[] {
    return bestPractices.map(bp => `${bp.category}: ${bp.title}`);
  }
};