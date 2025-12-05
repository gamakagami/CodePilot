import { PrismaClient } from "@prisma/client";
import { PredictionInput } from "./prediction.types";
import { runPythonPredict } from "../../utils/loadModel";

const prisma = new PrismaClient();

export const predictionService = {
  async predictFailure(data: PredictionInput) {
    const result = await runPythonPredict(data);

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

    // 👍 This works (covers 0/1 and true/false)
    containsTestChanges: data.containsTestChanges === 1 || data.containsTestChanges === true,

    previousFailureRate: data.previous_failure_rate,

    // 👍 Converts Python 0/1 → boolean
    predictedFailure: result.predicted_failure === 1,

    failureProbability: result.failure_probability
  }
});

    return result;
  }
};
