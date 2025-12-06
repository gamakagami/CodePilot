import { llmClient } from "../utils/llmClient";
import { ReviewRequest, ReviewResponse, ReviewIssue } from "../types/review.types";

export const reviewService = {
  async generateReview(request: ReviewRequest): Promise<ReviewResponse> {
    console.log(`🔍 Generating review for ${request.analysis.fileId}...`);

    // Build structured prompt with analysis and prediction context
    const prompt = this.buildReviewPrompt(request);

    // Get LLM response
    const llmResponse = await llmClient(prompt);

    // Parse and structure the response
    const review = this.parseReviewResponse(llmResponse, request);

    console.log(`✅ Review generated: ${review.issues.length} issues found`);
    return review;
  },

  buildReviewPrompt(request: ReviewRequest): string {
    const { analysis, prediction } = request;

    return `You are a senior software engineer conducting a code review for a MERN stack application.

# ANALYSIS RESULTS
File: ${analysis.fileId}
Lines of Code: ${analysis.metrics.totalLines}
Functions: ${analysis.metrics.functionCount}
Cyclomatic Complexity: ${analysis.metrics.cyclomaticComplexity}
Has Error Handling: ${analysis.mernPatterns.hasErrorHandling ? 'Yes' : 'No'}
Has Validation: ${analysis.mernPatterns.hasValidation ? 'Yes' : 'No'}
Uses Express: ${analysis.mernPatterns.usesExpress ? 'Yes' : 'No'}
Uses MongoDB: ${analysis.mernPatterns.usesMongoDB ? 'Yes' : 'No'}
Has Circular Dependencies: ${analysis.dependencies.hasCycles ? 'Yes' : 'No'}

# DETECTED ISSUES
${analysis.mernPatterns.potentialIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

# ML PREDICTION
Failure Probability: ${(prediction.failure_probability * 100).toFixed(1)}%
Will Likely Fail: ${prediction.will_fail ? 'YES' : 'NO'}
Confidence: ${prediction.confidence}

# YOUR TASK
Based on the above analysis and ML prediction, provide a structured code review with:

1. **Summary** - Brief overview of the code's purpose and quality
2. **Risk Assessment** - Overall risk level (low/medium/high/critical) and whether to merge
3. **Issues** - List specific issues found with severity (critical/high/medium/low), category (bug/security/performance/maintainability/style), and suggestions
4. **Recommendations** - Actionable steps to improve the code
5. **Quality Score** - Rate the code 0-100 with strengths and weaknesses

Format your response as JSON:
{
  "summary": "string",
  "riskLevel": "low|medium|high|critical",
  "shouldMerge": boolean,
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "bug|security|performance|maintainability|style",
      "title": "string",
      "description": "string",
      "location": "string (optional)",
      "suggestion": "string (optional)"
    }
  ],
  "recommendations": ["string"],
  "codeQuality": {
    "score": number,
    "strengths": ["string"],
    "weaknesses": ["string"]
  }
}

Provide ONLY the JSON, no additional text.`;
  },

  parseReviewResponse(llmResponse: string, request: ReviewRequest): ReviewResponse {
    try {
      // Try to parse as JSON
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
      
      // Fallback: Create structured review from analysis
      return this.createFallbackReview(request);
    }
  },

  createFallbackReview(request: ReviewRequest): ReviewResponse {
    const { analysis, prediction } = request;
    
    // Convert detected issues to structured format
    const issues: ReviewIssue[] = analysis.mernPatterns.potentialIssues.map(issue => ({
      severity: this.determineSeverity(issue),
      category: this.determineCategory(issue),
      title: issue,
      description: `This issue was detected by static analysis: ${issue}`,
      suggestion: this.getSuggestion(issue)
    }));

    // Determine risk level based on prediction and complexity
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (prediction.failure_probability > 0.7) riskLevel = "critical";
    else if (prediction.failure_probability > 0.5) riskLevel = "high";
    else if (prediction.failure_probability > 0.3 || analysis.metrics.cyclomaticComplexity > 15) riskLevel = "medium";

    return {
      summary: `Code analysis for ${analysis.fileId} shows ${issues.length} potential issues with ${(prediction.failure_probability * 100).toFixed(1)}% failure probability.`,
      riskLevel,
      shouldMerge: riskLevel === "low" || riskLevel === "medium",
      issues,
      recommendations: this.generateRecommendations(analysis, prediction),
      codeQuality: {
        score: this.calculateQualityScore(analysis),
        strengths: this.identifyStrengths(analysis),
        weaknesses: analysis.mernPatterns.potentialIssues
      },
      generatedAt: new Date().toISOString()
    };
  },

  determineSeverity(issue: string): "critical" | "high" | "medium" | "low" {
    const lowerIssue = issue.toLowerCase();
    if (lowerIssue.includes('injection') || lowerIssue.includes('credential')) return 'critical';
    if (lowerIssue.includes('try-catch') || lowerIssue.includes('validation')) return 'high';
    if (lowerIssue.includes('status code')) return 'medium';
    return 'low';
  },

  determineCategory(issue: string): "bug" | "security" | "performance" | "maintainability" | "style" {
    const lowerIssue = issue.toLowerCase();
    if (lowerIssue.includes('injection') || lowerIssue.includes('credential')) return 'security';
    if (lowerIssue.includes('try-catch') || lowerIssue.includes('validation')) return 'bug';
    if (lowerIssue.includes('console.log')) return 'style';
    return 'maintainability';
  },

  getSuggestion(issue: string): string {
    const lowerIssue = issue.toLowerCase();
    if (lowerIssue.includes('try-catch')) return 'Add try-catch blocks around async operations';
    if (lowerIssue.includes('validation')) return 'Use a validation library like Joi, Zod, or Yup';
    if (lowerIssue.includes('console.log')) return 'Replace console.log with a proper logging library (Winston, Pino)';
    if (lowerIssue.includes('status code')) return 'Always return explicit HTTP status codes (e.g., res.status(200).json(...))';
    return 'Review and fix this issue';
  },

  generateRecommendations(analysis: any, prediction: any): string[] {
    const recommendations: string[] = [];

    if (prediction.failure_probability > 0.5) {
      recommendations.push('⚠️ High failure risk - Request thorough code review before merging');
    }

    if (analysis.metrics.cyclomaticComplexity > 15) {
      recommendations.push('📉 Refactor complex functions into smaller, more manageable pieces');
    }

    if (!analysis.mernPatterns.hasErrorHandling) {
      recommendations.push('🛡️ Add comprehensive error handling with try-catch blocks');
    }

    if (!analysis.mernPatterns.hasValidation) {
      recommendations.push('✅ Implement input validation using a schema validation library');
    }

    if (analysis.dependencies.hasCycles) {
      recommendations.push('🔄 Resolve circular dependencies to improve maintainability');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Code looks good - proceed with standard review process');
    }

    return recommendations;
  },

  calculateQualityScore(analysis: any): number {
    let score = 100;

    // Deduct for complexity
    if (analysis.metrics.cyclomaticComplexity > 20) score -= 30;
    else if (analysis.metrics.cyclomaticComplexity > 10) score -= 15;

    // Deduct for missing patterns
    if (!analysis.mernPatterns.hasErrorHandling) score -= 20;
    if (!analysis.mernPatterns.hasValidation) score -= 15;

    // Deduct for issues
    score -= analysis.mernPatterns.potentialIssues.length * 5;

    // Deduct for circular dependencies
    if (analysis.dependencies.hasCycles) score -= 15;

    return Math.max(score, 0);
  },

  identifyStrengths(analysis: any): string[] {
    const strengths: string[] = [];

    if (analysis.mernPatterns.hasErrorHandling) {
      strengths.push('Proper error handling implemented');
    }

    if (analysis.mernPatterns.hasValidation) {
      strengths.push('Input validation in place');
    }

    if (analysis.metrics.cyclomaticComplexity < 10) {
      strengths.push('Low complexity - easy to understand and maintain');
    }

    if (!analysis.dependencies.hasCycles) {
      strengths.push('Clean dependency structure');
    }

    return strengths.length > 0 ? strengths : ['Code follows basic structure'];
  }
};