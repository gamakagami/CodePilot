import { PrismaClient } from "@prisma/client";
import { PredictionInput, PredictionResult } from "./prediction.types";
import { runPythonPredict } from "../../utils/loadModel";

const prisma = new PrismaClient();

class PredictionService {
  async predictFailure(data: PredictionInput): Promise<PredictionResult> {
    console.log("🔮 Predicting failure for:", {
      developer: data.developer,
      module: data.module_type,
      complexity: data.avg_function_complexity
    });

    // Run ML prediction
    const result = await runPythonPredict(data);
    console.log(`✅ Prediction complete: ${result.predicted_failure ? 'FAIL' : 'PASS'} (${(result.failure_probability * 100).toFixed(1)}%)`);

    // Store prediction in database
    try {
      await prisma.prediction.create({
        data: {
          timestamp: new Date(data.timestamp),
          developer: data.developer,
          moduleType: data.module_type,
          linesAdded: data.lines_added,
          linesDeleted: data.lines_deleted,
          filesChanged: data.files_changed,
          avgFunctionComplexity: data.avg_function_complexity,
          codeCoverageChange: data.code_coverage_change,
          buildDuration: data.build_duration,
          containsTestChanges: data.contains_test_changes === 1,
          previousFailureRate: data.previous_failure_rate,
          predictedFailure: result.predicted_failure === 1,
          failureProbability: result.failure_probability
        }
      });
      console.log("💾 Prediction stored in database");
    } catch (err: any) {
      console.error("⚠️ Failed to store prediction:", err.message);
      // Don't throw - prediction still succeeded even if DB save failed
    }

    return result;
  }

  /**
   * Get prediction history for a developer
   */
  async getHistory(developer: string, limit: number = 10) {
    return prisma.prediction.findMany({
      where: { developer },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get aggregate stats
   */
  async getStats() {
    const total = await prisma.prediction.count();
    const failed = await prisma.prediction.count({
      where: { predictedFailure: true }
    });

    const avgProbability = await prisma.prediction.aggregate({
      _avg: { failureProbability: true }
    });

    return {
      totalPredictions: total,
      failedPredictions: failed,
      successRate: total > 0 ? ((total - failed) / total * 100).toFixed(1) : 0,
      avgFailureProbability: avgProbability._avg.failureProbability?.toFixed(3) || 0
    };
  }
}

export const predictionService = new PredictionService();