import { ReviewResponse } from "../types/review.types";
import { spawn } from "child_process";
import * as path from "path";

export interface EvaluationResult {
  bleu?: number;
  rouge?: { precision: number; recall: number; f1: number };
  bertScore?: { precision: number; recall: number; f1: number };
  error?: string;
}

function getPythonCommand(): string {
  const platform = process.platform;
  return platform === 'win32' ? 'python' : 'python3';
}

export const evaluationService = {
  async evaluateReview(
    generated: ReviewResponse,
    reference: string
  ): Promise<EvaluationResult> {
    return new Promise((resolve, reject) => {
      const pythonCmd = getPythonCommand();
      const scriptPath = path.join(__dirname, "../scripts/evaluate.py");
      
      console.log(`Evaluating review with ${pythonCmd}...`);
      
      const py = spawn(pythonCmd, [
        scriptPath,
        JSON.stringify(generated.summary),
        reference
      ]);

      let output = "";
      let errorOutput = "";
      
      py.stdout.on("data", (data) => {
        output += data.toString();
      });
      
      py.stderr.on("data", (err) => {
        const errStr = err.toString();
        // Only log actual errors, not warnings
        if (!errStr.includes('UserWarning') && 
            !errStr.includes('tensorflow') && 
            !errStr.includes('huggingface')) {
          errorOutput += errStr;
          console.error("Python error:", errStr);
        }
      });

      py.on("error", (error) => {
        console.error("Failed to start Python process:", error);
        reject(new Error(`Python execution failed: ${error.message}`));
      });

      py.on("close", (code) => {
        if (code !== 0 && code !== null) {
          return reject(new Error(`Python script exited with code ${code}. ${errorOutput || 'Unknown error'}`));
        }
        
        try {
          if (!output.trim()) {
            return reject(new Error("No output from evaluation script"));
          }
          
          const result = JSON.parse(output);
          
          // Check if there's an error in the result
          if (result.error) {
            return reject(new Error(result.error));
          }
          
          console.log(`Evaluation complete - BLEU: ${result.bleu?.toFixed(3)}, ROUGE-L F1: ${result.rouge?.f1?.toFixed(3)}`);
          resolve(result);
        } catch (e: any) {
          reject(new Error(`Failed to parse evaluation output: ${e.message}\nOutput: ${output}`));
        }
      });
    });
  },

  aggregateResults(results: EvaluationResult[]): {
    meanBleu: number;
    meanRougeF1: number;
    meanBertF1: number;
  } {
    const safeMean = (arr: (number | undefined)[]) => {
      const validNumbers = arr.filter((x): x is number => x !== undefined && !isNaN(x));
      if (validNumbers.length === 0) return 0;
      return validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length;
    };

    return {
      meanBleu: safeMean(results.map(r => r.bleu)),
      meanRougeF1: safeMean(results.map(r => r.rouge?.f1)),
      meanBertF1: safeMean(results.map(r => r.bertScore?.f1)),
    };
  }
};