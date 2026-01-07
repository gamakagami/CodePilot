import { PrismaClient } from "@prisma/client";
import { PredictionInput, PredictionResult } from "./prediction.types";
import { runLLMPredict } from "../../utils/runLLMPredict";

const prisma = new PrismaClient();

class PredictionService {
  async predictFailure(data: PredictionInput): Promise<PredictionResult> {
    console.log("🔮 [PREDICTION] Starting failure prediction with LLM...");
    console.log("📊 [PREDICTION] Input data structure:", {
      developer: data.developer,
      module: data.module_type,
      complexity: data.avg_function_complexity,
      hasOriginalCode: !!data.originalCode,
      codeLength: data.originalCode?.length || 0,
      hasContext: !!data.context,
      hasRepoContext: !!data.repoContext,
      repoContextFiles: data.repoContext?.length || 0,
      hasActualIssues: !!data.actualIssues,
      actualIssuesKeys: data.actualIssues ? Object.keys(data.actualIssues) : []
    });

    // Enhanced payload for LLM with all available data
    const enhancedPayload = {
      // Original code for deep analysis
      originalCode: data.originalCode,
      
      // Full codebase context for comprehensive analysis
      repoContext: data.repoContext || [],
      
      // File identification
      fileId: data.fileId || 'unknown',
      timestamp: data.timestamp,
      
      // Structural information
      structure: {
        functions: data.functions || [],
        imports: data.imports || []
      },
      
      // Metrics
      metrics: {
        totalLines: data.metrics?.totalLines || 0,
        cyclomaticComplexity: data.metrics?.cyclomaticComplexity || data.avg_function_complexity || 0,
        functionCount: data.metrics?.functionCount || 0,
        avgFunctionLength: data.metrics?.avgFunctionLength || 0,
        complexityRating: data.metrics?.complexityRating || 'unknown'
      },
      
      // MERN patterns
      mernPatterns: data.mernPatterns || {},
      
      // Dependencies
      dependencies: data.dependencies || {
        direct: [],
        reverse: [],
        hasCycles: false
      },
      
      // Context (scope information)
      context: data.context || {
        availableInScope: {
          variables: [],
          functions: [],
          hooks: [],
          imports: []
        },
        externalDeps: {
          npm: [],
          internal: []
        },
        propsAvailable: {}
      },
      
      // Actual issues from static analysis
      actualIssues: data.actualIssues || {
        undefinedVariables: [],
        undefinedFunctions: [],
        missingImports: [],
        syntaxErrors: [],
        nullSafetyIssues: [],
        unhandledPromises: [],
        typeMismatches: []
      },
      
      // Warnings and recommendations
      warnings: data.warnings || [],
      recommendations: data.recommendations || [],
      
      // Metadata for ML features
      developer: data.developer || "unknown",
      module_type: data.module_type || "general",
      lines_added: data.lines_added || 0,
      lines_deleted: data.lines_deleted || 0,
      files_changed: data.files_changed || 1,
      code_coverage_change: data.code_coverage_change || 0,
      build_duration: data.build_duration || 0,
      contains_test_changes: data.contains_test_changes || 0,
      previous_failure_rate: data.previous_failure_rate || 0,
      avg_function_complexity: data.avg_function_complexity || data.metrics?.cyclomaticComplexity || 0
    };

    console.log("🔍 [PREDICTION] Enhanced payload prepared:");
    console.log("   - Original code:", enhancedPayload.originalCode ? `${enhancedPayload.originalCode.length} chars` : 'not provided');
    console.log("   - Repo context:", enhancedPayload.repoContext ? `${enhancedPayload.repoContext.length} files` : 'not provided');
    console.log("   - Metrics:", enhancedPayload.metrics);
    console.log("   - Context scope:", {
      variables: enhancedPayload.context.availableInScope.variables.length,
      functions: enhancedPayload.context.availableInScope.functions.length,
      hooks: enhancedPayload.context.availableInScope.hooks.length,
      imports: enhancedPayload.context.availableInScope.imports.length
    });
    console.log("   - Actual issues:", {
      undefinedVariables: enhancedPayload.actualIssues.undefinedVariables?.length || 0,
      undefinedFunctions: enhancedPayload.actualIssues.undefinedFunctions?.length || 0,
      missingImports: enhancedPayload.actualIssues.missingImports?.length || 0,
      syntaxErrors: enhancedPayload.actualIssues.syntaxErrors?.length || 0,
      nullSafetyIssues: enhancedPayload.actualIssues.nullSafetyIssues?.length || 0,
      unhandledPromises: enhancedPayload.actualIssues.unhandledPromises?.length || 0,
      typeMismatches: enhancedPayload.actualIssues.typeMismatches?.length || 0
    });

    // Run LLM prediction with enhanced payload
    const result = await runLLMPredict(enhancedPayload);
    
    console.log(
      `[PREDICTION] Prediction complete: ${result.predicted_failure ? "⚠️ FAIL" : "✓ PASS"} (${(
        result.failure_probability * 100
      ).toFixed(1)}% probability)`
    );
    console.log(`   - Confidence: ${result.confidence || 'unknown'}`);
    console.log(`   - Reasoning: ${result.reasoning?.substring(0, 150)}...`);

    // Store prediction in database (optional - service works without it)
    try {
      await prisma.prediction.create({
        data: {
          timestamp: new Date(data.timestamp),
          developer: data.developer || "unknown",
          moduleType: data.module_type || "general",
          linesAdded: data.lines_added || 0,
          linesDeleted: data.lines_deleted || 0,
          filesChanged: data.files_changed || 1,
          codeCoverageChange: data.code_coverage_change || 0,
          buildDuration: data.build_duration || 0,
          containsTestChanges: data.contains_test_changes === 1,
          previousFailureRate: data.previous_failure_rate || 0,
          predictedFailure: result.predicted_failure === 1,
          failureProbability: result.failure_probability,
          avgFunctionComplexity: enhancedPayload.avg_function_complexity
        }
      });
      console.log("[PREDICTION] Prediction stored in database");
    } catch (err: any) {
      // Database storage is optional - log warning but don't fail the prediction
      if (err.message?.includes("does not exist") || err.message?.includes("table")) {
        console.warn("⚠️ [PREDICTION] Database table not found - prediction storage skipped. Run migrations to enable storage.");
      } else {
        console.warn("⚠️ [PREDICTION] Failed to store prediction in database (non-critical):", err.message);
      }
      // Continue - prediction result is still returned successfully
    }

    return result;
  }

  async getHistory(developer: string, limit: number = 10) {
    console.log(`[PREDICTION] Fetching history for developer: ${developer} (limit: ${limit})`);
    
    try {
      const history = await prisma.prediction.findMany({
        where: { developer },
        orderBy: { createdAt: "desc" },
        take: limit
      });
      
      console.log(`[PREDICTION] Found ${history.length} predictions`);
      return history;
    } catch (err: any) {
      if (err.message?.includes("does not exist") || err.message?.includes("table")) {
        console.warn("[PREDICTION] Database table not found - returning empty history");
        return [];
      }
      throw err;
    }
  }

  async getStats() {
    console.log("[PREDICTION] Calculating statistics...");
    
    try {
      const total = await prisma.prediction.count();
      const failed = await prisma.prediction.count({
        where: { predictedFailure: true }
      });

      const avgProbability = await prisma.prediction.aggregate({
        _avg: { failureProbability: true }
      });

      const stats = {
        totalPredictions: total,
        failedPredictions: failed,
        successRate:
          total > 0 ? (((total - failed) / total) * 100).toFixed(1) : "0",
        avgFailureProbability:
          avgProbability._avg.failureProbability?.toFixed(3) || "0"
      };
      
      console.log("[PREDICTION] Statistics calculated:", stats);
      return stats;
    } catch (err: any) {
      if (err.message?.includes("does not exist") || err.message?.includes("table")) {
        console.warn("[PREDICTION] Database table not found - returning default stats");
        return {
          totalPredictions: 0,
          failedPredictions: 0,
          successRate: "0",
          avgFailureProbability: "0"
        };
      }
      throw err;
    }
  }
}

export const predictionService = new PredictionService();