import { llmClient } from "../utils/llmClient";
import { ReviewRequest, ReviewResponse, ReviewIssue } from "../types/review.types";

export const reviewService = {
  async generateReview(request: ReviewRequest): Promise<ReviewResponse> {
    console.log(`🔍 Generating review for ${request.analysis.fileId}...`);

    const prompt = this.buildReviewPrompt(request);
    const llmResponse = await llmClient(prompt);
    const review = this.parseReviewResponse(llmResponse, request);

    console.log(`✅ Review generated: ${review.issues.length} issues found`);
    return review;
  },
  buildReviewPrompt(request: ReviewRequest): string {
  const { analysis, prediction } = request;

  return `You are a professional code review system. Generate a structured JSON review using the schema below. 
Focus on accuracy, clarity, and technical detail. You may vary sentence phrasing in summaries, but the JSON keys and structure must remain exact.

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

# DETECTED ISSUES
${analysis.mernPatterns.potentialIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n') || 'None'}

# OUTPUT REQUIREMENTS
1. Return ONLY valid JSON (no markdown, no extra text).
2. Keys must match exactly: summary, riskLevel, shouldMerge, issues, recommendations, codeQuality.
3. Summary must mention filename, lines, functions, complexity, failure probability, confidence, issue count, and risk level. 
   - You may vary sentence structure and synonyms (e.g., "Analysis found" vs "Analysis identified").
   - Always include a "Critical:" note if major risks exist.
4. Issues must follow this format:
   - title: concise and specific
   - description: start with "Static analysis detected:" then explain
   - location: reference file and function(s)
   - suggestion: actionable fix
5. Recommendations must use these prefixes:
   - "⚠️ HIGH PRIORITY:" for critical fixes
   - "📉 Refactor ..." for complexity/quality
   - "🛡️ Implement ..." for missing features
   - "✅ Code looks good" only if no issues
6. Code quality scoring rules:
   - Start at 100
   - Deduct 30 if complexity > 20
   - Deduct 15 if complexity > 10
   - Deduct 20 if error handling missing
   - Deduct 15 if validation missing
   - Deduct 5 per issue (max 25)
   - Deduct 15 if circular dependencies
   - Minimum score = 0

# OUTPUT JSON SCHEMA

{
  "summary": "Code review for ${analysis.fileId} (${analysis.metrics.totalLines} lines, ${analysis.metrics.functionCount} functions, complexity: ${analysis.metrics.cyclomaticComplexity}). The ML model predicts ${(prediction.failure_probability * 100).toFixed(1)}% failure probability with ${prediction.confidence} confidence. Analysis found [X] issues including: [TOP ISSUES]. Critical: [NOTES]. Risk level: [LEVEL].",
  "riskLevel": "${this.determineRiskLevel(prediction.failure_probability, analysis.metrics.cyclomaticComplexity)}",
  "shouldMerge": ${this.shouldMerge(prediction.failure_probability, analysis.metrics.cyclomaticComplexity)},
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "bug|security|performance|maintainability|style",
      "title": "Specific issue title",
      "description": "Static analysis detected: [details]",
      "location": "${analysis.fileId} - [function/area]",
      "suggestion": "Concrete fix"
    }
  ],
  "recommendations": [
    "⚠️ HIGH PRIORITY: ...",
    "📉 Refactor ...",
    "🛡️ Implement ..."
  ],
  "codeQuality": {
    "score": ${this.calculateQualityScore(analysis)},
    "strengths": ["Specific strengths"],
    "weaknesses": ["Specific weaknesses"]
  }
}

Remember: vary phrasing in summaries, but keep JSON schema exact.`;
}

  ,

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
        recommendations: parsed.recommendations || [],
        codeQuality: parsed.codeQuality || {
          score: 50,
          strengths: [],
          weaknesses: []
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
    
    const issues: ReviewIssue[] = analysis.mernPatterns.potentialIssues.map(issue => ({
      severity: this.determineSeverity(issue),
      category: this.determineCategory(issue),
      title: issue,
      description: `Static analysis detected: ${issue}. This pattern was identified in ${analysis.fileId} which contains ${analysis.metrics.functionCount} functions across ${analysis.metrics.totalLines} lines of code.`,
      location: `${analysis.fileId} - Multiple functions affected`,
      suggestion: this.getSuggestion(issue)
    }));

    const riskLevel = this.determineRiskLevel(prediction.failure_probability, analysis.metrics.cyclomaticComplexity);
    const issueCount = issues.length;
    const topIssues = analysis.mernPatterns.potentialIssues.slice(0, 2).join(', ') || 'None detected';
    
    let criticalNote = '';
    if (!analysis.mernPatterns.hasErrorHandling) {
      criticalNote = ' Critical: Missing error handling in async operations poses high risk of unhandled promise rejections.';
    } else if (analysis.dependencies.hasCycles) {
      criticalNote = ' Critical: Circular dependencies detected affecting maintainability.';
    } else if (prediction.failure_probability > 0.7) {
      criticalNote = ' Critical: High failure probability requires immediate code review.';
    }

    const summary = `Code review for ${analysis.fileId} (${analysis.metrics.totalLines} lines, ${analysis.metrics.functionCount} functions, complexity: ${analysis.metrics.cyclomaticComplexity}). The ML model predicts ${(prediction.failure_probability * 100).toFixed(1)}% failure probability with ${prediction.confidence} confidence. Analysis identified ${issueCount} issue${issueCount !== 1 ? 's' : ''} including: ${topIssues}.${criticalNote} Risk level: ${riskLevel}.`;

    return {
      summary,
      riskLevel: riskLevel as "low" | "medium" | "high" | "critical",
      shouldMerge: this.shouldMerge(prediction.failure_probability, analysis.metrics.cyclomaticComplexity),
      issues,
      recommendations: this.generateDetailedRecommendations(analysis, prediction),
      codeQuality: {
        score: this.calculateQualityScore(analysis),
        strengths: this.identifyDetailedStrengths(analysis),
        weaknesses: analysis.mernPatterns.potentialIssues.map(issue => 
          `${issue} (affects code reliability and maintainability)`
        )
      },
      generatedAt: new Date().toISOString()
    };
  },

  determineSeverity(issue: string): "critical" | "high" | "medium" | "low" {
    const lowerIssue = issue.toLowerCase();
    if (lowerIssue.includes('injection') || lowerIssue.includes('credential') || lowerIssue.includes('security')) return 'critical';
    if (lowerIssue.includes('try-catch') || lowerIssue.includes('validation') || lowerIssue.includes('error')) return 'high';
    if (lowerIssue.includes('status code') || lowerIssue.includes('complexity')) return 'medium';
    return 'low';
  },

  determineCategory(issue: string): "bug" | "security" | "performance" | "maintainability" | "style" {
    const lowerIssue = issue.toLowerCase();
    if (lowerIssue.includes('injection') || lowerIssue.includes('credential') || lowerIssue.includes('security')) return 'security';
    if (lowerIssue.includes('try-catch') || lowerIssue.includes('validation') || lowerIssue.includes('error')) return 'bug';
    if (lowerIssue.includes('console.log') || lowerIssue.includes('formatting')) return 'style';
    if (lowerIssue.includes('performance') || lowerIssue.includes('optimization')) return 'performance';
    return 'maintainability';
  },

  getSuggestion(issue: string): string {
    const lowerIssue = issue.toLowerCase();
    if (lowerIssue.includes('try-catch')) {
      return 'Wrap all async database operations and API calls in try-catch blocks. Return appropriate HTTP status codes (500 for server errors) with meaningful error messages.';
    }
    if (lowerIssue.includes('validation')) {
      return 'Implement input validation using a schema validation library like Joi, Zod, or express-validator. Validate all user inputs before processing.';
    }
    if (lowerIssue.includes('console.log')) {
      return 'Replace console.log statements with a proper logging library like Winston or Pino for production-ready logging with log levels.';
    }
    if (lowerIssue.includes('status code')) {
      return 'Always return explicit HTTP status codes using res.status(code).json(...) pattern. Use 200 for success, 400 for validation errors, 500 for server errors.';
    }
    if (lowerIssue.includes('injection')) {
      return 'Use parameterized queries or ORM methods (like Mongoose) to prevent injection attacks. Never concatenate user input directly into queries.';
    }
    return 'Review and address this issue according to MERN stack best practices.';
  },

  generateDetailedRecommendations(analysis: any, prediction: any): string[] {
    const recommendations: string[] = [];

    if (prediction.failure_probability > 0.7) {
      recommendations.push(
        `⚠️ HIGH PRIORITY: With ${(prediction.failure_probability * 100).toFixed(1)}% failure probability, conduct mandatory peer review and add comprehensive tests before merging`
      );
    } else if (prediction.failure_probability > 0.5) {
      recommendations.push(
        `⚠️ HIGH PRIORITY: ${(prediction.failure_probability * 100).toFixed(1)}% failure probability requires thorough code review focusing on error paths and edge cases`
      );
    }

    if (analysis.metrics.cyclomaticComplexity > 20) {
      recommendations.push(
        `📉 Refactor ${analysis.fileId} to reduce cyclomatic complexity from ${analysis.metrics.cyclomaticComplexity} to below 10 by breaking down complex functions into smaller units`
      );
    } else if (analysis.metrics.cyclomaticComplexity > 15) {
      recommendations.push(
        `📉 Refactor complex functions in ${analysis.fileId} to reduce complexity from ${analysis.metrics.cyclomaticComplexity} to improve maintainability`
      );
    }

    if (!analysis.mernPatterns.hasErrorHandling) {
      recommendations.push(
        `🛡️ Implement try-catch error handling in all ${analysis.metrics.functionCount} async functions using express-async-errors middleware or manual try-catch blocks`
      );
    }

    if (!analysis.mernPatterns.hasValidation) {
      recommendations.push(
        `🛡️ Implement input validation using Joi, Zod, or express-validator to prevent invalid data from entering the system`
      );
    }

    if (analysis.dependencies.hasCycles) {
      recommendations.push(
        `🔄 Resolve circular dependencies by restructuring module imports and using dependency injection patterns`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        `✅ Code looks good - proceed with standard review process and ensure adequate test coverage`
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
      strengths.push('Implements proper error handling with try-catch blocks in async operations');
    }

    if (analysis.mernPatterns.hasValidation) {
      strengths.push('Uses input validation to prevent invalid data from entering the system');
    }

    if (analysis.metrics.cyclomaticComplexity < 10) {
      strengths.push(`Low cyclomatic complexity (${analysis.metrics.cyclomaticComplexity}) indicates maintainable and testable code structure`);
    }

    if (!analysis.dependencies.hasCycles) {
      strengths.push('Clean dependency structure with no circular dependencies detected');
    }

    if (analysis.mernPatterns.usesExpress && analysis.mernPatterns.usesMongoDB) {
      strengths.push('Properly utilizes MERN stack patterns with Express routing and MongoDB integration');
    }

    if (analysis.metrics.functionCount > 0 && analysis.metrics.totalLines / analysis.metrics.functionCount < 50) {
      strengths.push('Functions are appropriately sized for readability and maintainability');
    }

    return strengths.length > 0 ? strengths : ['Follows basic MERN stack structure and conventions'];
  }
};