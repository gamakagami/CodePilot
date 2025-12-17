import { Request, Response } from "express";
import analysisService from "./analysis.service";
import { GraphService } from "../graph/graph.service";
import { predictFailure } from "../prediction/prediction.service";
import { generateReview } from "../review/review.service";

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
        previousFailureRate,
        repoContext,
        repositoryFullName
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
        previousFailureRate,
        repoContext,
        repositoryFullName
      });

      // Handle case where analysis returns null (parsing failed)
      if (!result) {
        return res.status(422).json({
          success: false,
          error: "Code parsing failed - file may be invalid or unsupported"
        });
      }

      // Build comprehensive response with MERN patterns + context
      const response = {
        success: true,
        data: {
          fileId: result.fileId,
          timestamp: result.timestamp,
          
          // IMPORTANT: Include original code for prediction service
          originalCode: code,
          
          // IMPORTANT: Include repoContext so prediction service gets the same codebase
          repoContext: repoContext || [],
          
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
              usesLeanQueries: result.mernPatterns.usesLeanQueries,
              hasQueries: result.mernPatterns.usesMongoDB || result.mernPatterns.usesMongoose
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

          // Contextual information for prediction service
          context: this.buildContext(result),

          // Actual issues found by static analysis
          actualIssues: this.detectActualIssues(result, code),

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

      // Step 2: Run failure prediction (using analysis data)
      console.log("🔮 [ANALYSIS] Running failure prediction...");
      let predictionResult;
      try {
        predictionResult = await predictFailure(response.data);
        console.log("✅ [ANALYSIS] Prediction complete");
      } catch (error: any) {
        console.error("⚠️ [ANALYSIS] Prediction failed:", error.message);
        predictionResult = {
          predicted_failure: 0,
          failure_probability: 0.3,
          will_fail: false,
          confidence: "low",
          reasoning: "Prediction service unavailable"
        };
      }

      // Step 3: Generate review (using analysis + prediction)
      console.log("📝 [ANALYSIS] Generating review...");
      let reviewResult;
      try {
        reviewResult = await generateReview({
          analysis: response.data,
          prediction: {
            will_fail: predictionResult.predicted_failure === 1 || predictionResult.will_fail === true,
            failure_probability: predictionResult.failure_probability,
            confidence: predictionResult.confidence || "medium",
            reasoning: predictionResult.reasoning
          },
          code: code,
          repoContext: repoContext || []
        });
        console.log("ANALYSIS Review complete");
      } catch (error: any) {
        console.error("ANALYSIS Review generation failed:", error.message);
        reviewResult = {
          summary: "Review generation failed",
          prComment: "Unable to generate review",
          riskLevel: "medium" as const,
          shouldMerge: false,
          shouldRequestChanges: true,
          issues: [],
          recommendations: ["Manual review required"],
          codeQuality: { score: 50, strengths: [], weaknesses: [] },
          mernSpecificFeedback: {},
          generatedAt: new Date().toISOString()
        };
      }

      // Combine all results
      const combinedResponse = {
        success: true,
        data: {
          ...response.data,
          // Add prediction results
          prediction: {
            predicted_failure: predictionResult.predicted_failure,
            failure_probability: predictionResult.failure_probability,
            will_fail: predictionResult.predicted_failure === 1 || predictionResult.will_fail === true,
            confidence: predictionResult.confidence || "medium",
            reasoning: predictionResult.reasoning,
            recommendation: predictionResult.predicted_failure === 1
              ? "High risk - Recommend additional review and testing"
              : "Low risk - Safe to proceed with standard review"
          },
          // Add review results
          review: reviewResult
        }
      };

      res.status(200).json(combinedResponse);
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
   * Build context object for prediction service
   */
  private buildContext(result: any): any {
    // Extract variables from functions
    const variables = new Set<string>();
    const functions = new Set<string>();
    const hooks = new Set<string>();
    const imports = new Set<string>();

    // Parse imports
    if (result.imports && Array.isArray(result.imports)) {
      result.imports.forEach((imp: string) => {
        // Extract import identifiers
        const importMatch = imp.match(/import\s+(?:{([^}]+)}|(\w+))\s+from/);
        if (importMatch) {
          if (importMatch[1]) {
            // Named imports: { useState, useEffect }
            importMatch[1].split(',').forEach(name => {
              const cleanName = name.trim();
              imports.add(cleanName);
              if (cleanName.startsWith('use')) hooks.add(cleanName);
            });
          } else if (importMatch[2]) {
            // Default import: React
            imports.add(importMatch[2].trim());
          }
        }
      });
    }

    // Parse functions for variable declarations
    if (result.functions && Array.isArray(result.functions)) {
      result.functions.forEach((fn: string) => {
        // Extract function names
        const fnNameMatch = fn.match(/function\s+(\w+)|const\s+(\w+)\s*=/);
        if (fnNameMatch) {
          functions.add(fnNameMatch[1] || fnNameMatch[2]);
        }

        // Extract useState declarations: const [x, setX] = useState
        const stateMatches = fn.matchAll(/const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState/g);
        for (const match of stateMatches) {
          variables.add(match[1]); // state variable
          variables.add(match[2]); // setter function
        }

        // Extract regular const/let/var declarations
        const varMatches = fn.matchAll(/(?:const|let|var)\s+(\w+)\s*=/g);
        for (const match of varMatches) {
          if (!match[0].includes('[')) { // Skip destructuring
            variables.add(match[1]);
          }
        }

        // Extract function parameters
        const paramMatch = fn.match(/\(([^)]*)\)/);
        if (paramMatch && paramMatch[1]) {
          paramMatch[1].split(',').forEach(param => {
            const cleanParam = param.trim().split(/[=:]/)[0].trim();
            if (cleanParam && !cleanParam.includes('{')) {
              variables.add(cleanParam);
            }
          });
        }
      });
    }

    // Detect NPM packages from imports
    const npmPackages = new Set<string>();
    if (result.imports && Array.isArray(result.imports)) {
      result.imports.forEach((imp: string) => {
        const packageMatch = imp.match(/from\s+['"]([^'"]+)['"]/);
        if (packageMatch) {
          const pkg = packageMatch[1];
          if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
            // External package
            npmPackages.add(pkg.split('/')[0]);
          }
        }
      });
    }

    return {
      availableInScope: {
        variables: Array.from(variables),
        functions: Array.from(functions),
        hooks: Array.from(hooks),
        imports: Array.from(imports)
      },
      externalDeps: {
        npm: Array.from(npmPackages),
        internal: [] // Could be enhanced with module resolution
      },
      propsAvailable: {
        names: [], // Could be detected from function params
        types: {}
      }
    };
  }

  /**
   * Detect actual issues through static analysis
   * Now works with original code for better accuracy
   */
  private detectActualIssues(result: any, originalCode: string): any {
    const issues: any = {
      undefinedVariables: [],
      undefinedFunctions: [],
      missingImports: [],
      syntaxErrors: [],
      nullSafetyIssues: [],
      unhandledPromises: [],
      typeMismatches: []
    };

    // Build available scope from the ORIGINAL CODE
    const availableVars = new Set<string>();
    const availableFuncs = new Set<string>();
    const availableImports = new Set<string>();

    // Parse imports from original code
    const importMatches = originalCode.matchAll(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      if (match[1]) {
        // Named imports: { useState, useEffect }
        match[1].split(',').forEach(name => availableImports.add(name.trim()));
      } else if (match[2]) {
        // Default import: React
        availableImports.add(match[2].trim());
      }
    }

    // Parse function declarations from original code
    const functionMatches = originalCode.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>))/g);
    for (const match of functionMatches) {
      availableFuncs.add(match[1] || match[2]);
    }

    // Parse variable declarations from original code
    const varMatches = originalCode.matchAll(/(?:const|let|var)\s+(\w+)\s*=/g);
    for (const match of varMatches) {
      availableVars.add(match[1]);
    }

    // Parse useState declarations: const [x, setX] = useState
    const stateMatches = originalCode.matchAll(/const\s+\[(\w+),\s*(\w+)\]\s*=\s*useState/g);
    for (const match of stateMatches) {
      availableVars.add(match[1]); // state variable
      availableVars.add(match[2]); // setter function
    }

    // Check for missing imports for hooks
    const lines = originalCode.split('\n');
    
    if (originalCode.includes('useState') && !availableImports.has('useState')) {
      const line = lines.findIndex(l => l.includes('useState')) + 1;
      issues.missingImports.push({
        identifier: 'useState',
        requiredFrom: 'react',
        line: line || 2
      });
    }

    if (originalCode.includes('useEffect') && !availableImports.has('useEffect')) {
      const line = lines.findIndex(l => l.includes('useEffect')) + 1;
      issues.missingImports.push({
        identifier: 'useEffect',
        requiredFrom: 'react',
        line: line || 4
      });
    }

    if (originalCode.includes('useContext') && !availableImports.has('useContext')) {
      const line = lines.findIndex(l => l.includes('useContext')) + 1;
      issues.missingImports.push({
        identifier: 'useContext',
        requiredFrom: 'react',
        line: line || 3
      });
    }

    // Check for unhandled promises
    const promiseMatches = originalCode.matchAll(/(\w+)\([^)]*\)\.then\(/g);
    for (const match of promiseMatches) {
      const functionCall = match[0].replace('.then(', '');
      const startIndex = match.index || 0;
      
      // Check if there's a .catch() after this .then()
      const afterThen = originalCode.substring(startIndex);
      const hasCatch = afterThen.match(/\.then\([^)]*\)[^.]*\.catch\(/);
      const hasTryCatch = originalCode.substring(Math.max(0, startIndex - 200), startIndex).includes('try');
      
      if (!hasCatch && !hasTryCatch) {
        const line = originalCode.substring(0, startIndex).split('\n').length;
        issues.unhandledPromises.push({
          functionCall,
          line,
          reason: 'Promise has no .catch() or try-catch block'
        });
      }
    }

    // Check for null safety issues
    const propertyAccessMatches = originalCode.matchAll(/(\w+)\.(\w+)/g);
    for (const match of propertyAccessMatches) {
      const varName = match[1];
      const fullMatch = match[0];
      const startIndex = match.index || 0;
      
      // Skip method calls on built-in objects
      const builtins = ['console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number'];
      if (builtins.includes(varName)) continue;
      
      // Check if variable is initialized as null
      const initMatch = originalCode.match(new RegExp(`${varName}\\s*=\\s*(?:null|undefined)`));
      if (initMatch) {
        // Check if there's a null check before this access
        const beforeAccess = originalCode.substring(Math.max(0, startIndex - 500), startIndex);
        const hasNullCheck = beforeAccess.match(new RegExp(`if\\s*\\([^)]*${varName}[^)]*\\)|${varName}\\s*&&|${varName}\\?\\.|!${varName}`));
        
        if (!hasNullCheck) {
          const line = originalCode.substring(0, startIndex).split('\n').length;
          issues.nullSafetyIssues.push({
            variable: varName,
            accessPath: fullMatch,
            line,
            reason: `${varName} could be null/undefined without safety check`
          });
        }
      }
    }

    // Check for undefined function calls
    const functionCallMatches = originalCode.matchAll(/(\w+)\(/g);
    const builtins = [
      // Browser/Node.js globals
      'console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
      'encodeURIComponent', 'decodeURIComponent', 'fetch', 'Promise', 'JSON',
      // Node.js globals
      'require', 'import', 'module', 'exports', 'process', 'Buffer', 'global',
      // Common APIs
      'alert', 'confirm', 'prompt', 'atob', 'btoa', 'URL', 'URLSearchParams',
      // React/JSX (if in React context)
      'React', 'ReactDOM'
    ];
    
    for (const match of functionCallMatches) {
      const funcName = match[1];
      const startIndex = match.index || 0;
      
      // Skip if it's a method call (has a dot before it)
      const beforeCall = originalCode.substring(Math.max(0, startIndex - 1), startIndex);
      if (beforeCall === '.') continue;
      
      // Skip built-in functions
      if (builtins.includes(funcName)) continue;
      
      // Check if function is defined or imported
      if (!availableFuncs.has(funcName) && 
          !availableImports.has(funcName) &&
          !availableVars.has(funcName)) {
        
        const line = originalCode.substring(0, startIndex).split('\n').length;
        const suggestion = this.findSimilarName(funcName, Array.from(availableFuncs));
        
        issues.undefinedFunctions.push({
          name: funcName,
          line,
          suggestion: suggestion || undefined
        });
      }
    }

    return issues;
  }

  /**
   * Find similar variable/function names for suggestions
   */
  private findSimilarName(target: string, available: string[]): string | null {
    const maxDistance = 2; // Maximum Levenshtein distance
    
    for (const name of available) {
      const distance = this.levenshteinDistance(target.toLowerCase(), name.toLowerCase());
      if (distance <= maxDistance) {
        return name;
      }
    }
    
    return null;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[b.length][a.length];
  }

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

  /**
   * Store repository context in Neo4j
   */
  storeRepositoryContext = async (req: Request, res: Response) => {
    try {
      const { repositoryFullName, files } = req.body;

      if (!repositoryFullName) {
        return res.status(400).json({
          error: "Missing 'repositoryFullName' in request body"
        });
      }

      if (!files || !Array.isArray(files)) {
        return res.status(400).json({
          error: "Missing 'files' array in request body"
        });
      }

      const graphService = new GraphService();
      const result = await graphService.storeRepositoryContext(repositoryFullName, files);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error: any) {
      console.error("Store repository context error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to store repository context"
      });
    }
  };
}

export default new AnalysisController();