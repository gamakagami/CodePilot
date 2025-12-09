// evaluation.service.ts
import { ReviewResponse } from "../types/review.types";
import { spawn } from "child_process";

export interface EvaluationResult {
  bleu?: number;
  rouge?: { precision: number; recall: number; f1: number };
  bertScore?: { precision: number; recall: number; f1: number };
}

export const evaluationService = {
  async evaluateReview(
    generated: ReviewResponse,
    reference: string
  ): Promise<EvaluationResult> {
    // Call Python script to compute BLEU, ROUGE, BERTScore
    return new Promise((resolve, reject) => {
      const py = spawn("python3", ["./src/scripts/evaluate.py", JSON.stringify(generated.summary), reference]);

      let output = "";
      py.stdout.on("data", (data) => (output += data.toString()));
      py.stderr.on("data", (err) => console.error("Eval error:", err.toString()));

      py.on("close", () => {
  try {
    if (!output.trim()) {
      return reject(new Error("No output from evaluation script"));
    }
    resolve(JSON.parse(output));
  } catch (e) {
    reject(new Error("Failed to parse evaluation output: " + e.message));
  }
});
    });
  },

  aggregateResults(results: EvaluationResult[]): {
    meanBleu: number;
    meanRougeF1: number;
    meanBertF1: number;
  } {
    const safeMean = (arr: (number | undefined)[]) =>
      arr.filter((x): x is number => x !== undefined).reduce((a, b) => a + b, 0) /
      arr.filter((x): x is number => x !== undefined).length;

    return {
      meanBleu: safeMean(results.map(r => r.bleu)),
      meanRougeF1: safeMean(results.map(r => r.rouge?.f1)),
      meanBertF1: safeMean(results.map(r => r.bertScore?.f1)),
    };
  }
};