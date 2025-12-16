import { Request, Response } from "express";
import analysisService from "./analysis.service";

class AnalysisController {
  analyze = async (req: Request, res: Response) => {
    try {
      const { 
        code, 
        fileId,
        developer,
        linesAdded,
        linesDeleted,
        filesChanged,
        codeCoverageChange,
        buildDuration,
        previousFailureRate
      } = req.body;

      if (!code) {
        return res.status(400).json({ 
          error: "Missing 'code' in request body" 
        });
      }

      const result = await analysisService.analyze({
        code,
        fileId,
        developer,
        linesAdded,
        linesDeleted,
        filesChanged,
        codeCoverageChange,
        buildDuration,
        previousFailureRate
      });

      // Handle case where analysis returns null (parsing failed)
      if (!result) {
        return res.status(422).json({
          success: false,
          error: "Code parsing failed - file may be invalid or unsupported"
        });
      }

      // Build comprehensive response with MERN patterns
      const response = {
        success: true,
        data: {
          fileId: result.fileId,
          timestamp: result.timestamp,
          
          // Code structure
          structure: {
            functions: result.functions,
            imports: result.imports,
            functionCount: result.metrics.functionCount,
            importCount: result.metrics.importCount
          },

          // Code quality metrics
          metrics: {
            totalLines: result.metrics.totalLines,
            avgFunctionLength: result.metrics.avgFunctionLength,
            cyclomaticComplexity: result.metrics.cyclomaticComplexity,
            complexityRating: this.getComplexityRating(result.metrics.cyclomaticComplexity)
          },

          // Dependency analysis
          dependencies: {
            direct: result.dependencies.directDependencies,
            reverse: result.dependencies.reverseDependencies,
            hasCycles: result.dependencies.hasCycles,
            impactRadius: result.dependencies.impactRadius
          },

          // MERN-specific patterns - expanded
          mernPatterns: {
            // Error handling
            errorHandling: {
              hasErrorHandling: result.mernPatterns.hasErrorHandling,
              hasAsyncFunctions: result.mernPatterns.hasAsyncFunctions,
              asyncFunctionCount: result.mernPatterns.asyncFunctionCount,
              hasPromises: result.mernPatterns.hasPromises,
              hasUnhandledPromises: result.mernPatterns.hasUnhandledPromises
            },

            // Express patterns
            express: {
              usesExpress: result.mernPatterns.usesExpress,
              usesRouterModules: result.mernPatterns.usesRouterModules,
              hasCentralizedErrorMiddleware: result.mernPatterns.hasCentralizedErrorMiddleware,
              usesStatusCodesCorrectly: result.mernPatterns.usesStatusCodesCorrectly
            },

            // MongoDB/Mongoose patterns
            database: {
              usesMongoDB: result.mernPatterns.usesMongoDB,
              usesMongoose: result.mernPatterns.usesMongoose,
              hasSchemaValidation: result.mernPatterns.hasSchemaValidation,
              hasIndexesDefined: result.mernPatterns.hasIndexesDefined,
              usesLeanQueries: result.mernPatterns.usesLeanQueries
            },

            // Validation
            validation: {
              hasValidation: result.mernPatterns.hasValidation,
              validatesRequestBody: result.mernPatterns.validatesRequestBody,
              validatesQueryParams: result.mernPatterns.validatesQueryParams
            },

          // Issues and warnings
          potentialIssues: result.mernPatterns.potentialIssues,
          issueCount: result.mernPatterns.potentialIssues.length,
          severity: this.assessIssueSeverity(result.mernPatterns.potentialIssues)
        },

          // Code similarity
          similarPatterns: result.similarPatterns.map(pattern => ({
            id: pattern.id,
            similarityScore: Math.round(pattern.score * 100),
            metadata: pattern.metadata
          })),

          // ML prediction features
          predictionFeatures: result.predictionFeatures,

          // Analysis warnings
          warnings: result.warnings,
          hasWarnings: result.warnings.length > 0,

          // Recommendations for improvement
          recommendations: result.recommendations,
          recommendationCount: result.recommendations.length,
          highPriorityRecommendations: result.recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length,

          // Overall quality score
          qualityScore: this.calculateQualityScore(result)
        }
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Analysis failed",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };

  /**
   * Get a batch of analyses
   */
  batchAnalyze = async (req: Request, res: Response) => {
    try {
      const { files } = req.body;

      if (!files || !Array.isArray(files)) {
        return res.status(400).json({
          error: "Expected 'files' array in request body"
        });
      }

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          const result = await analysisService.analyze(file);
          if (result) {
            results.push({
              fileId: file.fileId,
              success: true,
              data: result
            });
          } else {
            errors.push({
              fileId: file.fileId,
              error: "Parsing failed"
            });
          }
        } catch (err: any) {
          errors.push({
            fileId: file.fileId,
            error: err.message
          });
        }
      }

      res.status(200).json({
        success: true,
        processed: results.length,
        failed: errors.length,
        results,
        errors
      });
    } catch (error: any) {
      console.error("Batch analysis error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * Get MERN-specific recommendations based on patterns
   */
  getRecommendations = async (req: Request, res: Response) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          error: "Missing 'code' in request body"
        });
      }

      const result = await analysisService.analyze({ code });

      if (!result) {
        return res.status(422).json({
          success: false,
          error: "Unable to analyze code"
        });
      }

      const recommendations = this.buildRecommendations(result.mernPatterns);

      res.status(200).json({
        success: true,
        recommendations,
        issueCount: result.mernPatterns.potentialIssues.length,
        priority: recommendations.filter(r => r.priority === 'high').length
      });
    } catch (error: any) {
      console.error("Recommendations error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // Helper methods

  private getComplexityRating(complexity: number): string {
    if (complexity <= 5) return "low";
    if (complexity <= 10) return "moderate";
    if (complexity <= 20) return "high";
    return "very_high";
  }

  private assessIssueSeverity(issues: string[]): string {
    const highSeverityKeywords = [
      "injection",
      "credentials",
      "security",
      "vulnerability"
    ];

    const hasHighSeverity = issues.some(issue =>
      highSeverityKeywords.some(keyword => 
        issue.toLowerCase().includes(keyword)
      )
    );

    if (hasHighSeverity) return "high";
    if (issues.length > 5) return "medium";
    if (issues.length > 0) return "low";
    return "none";
  }

  private calculateQualityScore(result: any): number {
    let score = 100;

    // Deduct for issues
    score -= result.mernPatterns.potentialIssues.length * 5;

    // Deduct for high complexity
    if (result.metrics.cyclomaticComplexity > 20) {
      score -= 15;
    } else if (result.metrics.cyclomaticComplexity > 10) {
      score -= 5;
    }

    // Bonus for good practices
    if (result.mernPatterns.hasErrorHandling) score += 5;
    if (result.mernPatterns.hasValidation) score += 5;
    if (result.mernPatterns.hasSchemaValidation) score += 5;
    if (result.mernPatterns.usesStatusCodesCorrectly) score += 3;

    // Deduct for cycles
    if (result.dependencies.hasCycles) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private buildRecommendations(patterns: any): any[] {
    const recommendations = [];

    // Error handling recommendations
    if (!patterns.hasErrorHandling && patterns.hasAsyncFunctions) {
      recommendations.push({
        category: "error_handling",
        priority: "high",
        message: "Add try-catch blocks to async functions",
        details: `Found ${patterns.asyncFunctionCount} async functions without proper error handling`
      });
    }

    if (patterns.hasUnhandledPromises) {
      recommendations.push({
        category: "error_handling",
        priority: "high",
        message: "Handle promise rejections",
        details: "Unhandled promises can crash your application"
      });
    }

    // Validation recommendations
    if (!patterns.hasValidation) {
      recommendations.push({
        category: "validation",
        priority: "high",
        message: "Add input validation",
        details: "Use libraries like Joi, Zod, or express-validator"
      });
    }

    if (!patterns.validatesRequestBody) {
      recommendations.push({
        category: "validation",
        priority: "medium",
        message: "Validate request body parameters",
        details: "Prevent invalid data from reaching your business logic"
      });
    }

    // Express recommendations
    if (patterns.usesExpress && !patterns.hasCentralizedErrorMiddleware) {
      recommendations.push({
        category: "express",
        priority: "medium",
        message: "Implement centralized error handling middleware",
        details: "Use app.use((err, req, res, next) => {...}) at the end of middleware chain"
      });
    }

    if (patterns.usesExpress && !patterns.usesStatusCodesCorrectly) {
      recommendations.push({
        category: "express",
        priority: "low",
        message: "Use explicit HTTP status codes",
        details: "Always call res.status(code) before sending responses"
      });
    }

    if (patterns.usesExpress && !patterns.usesRouterModules) {
      recommendations.push({
        category: "express",
        priority: "low",
        message: "Consider using Express Router for better organization",
        details: "Split routes into separate modules using express.Router()"
      });
    }

    // MongoDB/Mongoose recommendations
    if (patterns.usesMongoose && !patterns.hasSchemaValidation) {
      recommendations.push({
        category: "database",
        priority: "medium",
        message: "Add schema validation to Mongoose models",
        details: "Use built-in validators like required, min, max, enum"
      });
    }

    if (patterns.usesMongoose && !patterns.hasIndexesDefined) {
      recommendations.push({
        category: "database",
        priority: "medium",
        message: "Define indexes for frequently queried fields",
        details: "Improve query performance with proper indexing"
      });
    }

    if (patterns.usesMongoDB && !patterns.usesLeanQueries) {
      recommendations.push({
        category: "database",
        priority: "low",
        message: "Consider using .lean() for read-only queries",
        details: "Improve performance by returning plain JavaScript objects"
      });
    }

    // Security recommendations from potentialIssues
    for (const issue of patterns.potentialIssues) {
      let priority = "medium";
      let category = "general";

      if (issue.includes("injection")) {
        priority = "critical";
        category = "security";
      } else if (issue.includes("credentials")) {
        priority = "critical";
        category = "security";
      } else if (issue.includes("console.log")) {
        priority = "low";
        category = "logging";
      }

      recommendations.push({
        category,
        priority,
        message: issue,
        details: this.getIssueDetails(issue)
      });
    }

    return recommendations;
  }

  private getIssueDetails(issue: string): string {
    const detailsMap: { [key: string]: string } = {
      "injection": "Parameterize queries and use ORM methods to prevent injection attacks",
      "credentials": "Move sensitive data to environment variables using .env files",
      "console.log": "Use a proper logging library like Winston or Pino",
      "validation": "Validate all user inputs before processing",
      "status code": "Be explicit about HTTP status codes for better API clarity"
    };

    for (const [key, details] of Object.entries(detailsMap)) {
      if (issue.toLowerCase().includes(key)) {
        return details;
      }
    }

    return "Review and address this issue to improve code quality";
  }
}

export default new AnalysisController();