import axios from "axios";
import { servicesConfig } from "../config/services.config";
import { AnalyzePRRequest, OrchestratorResponse } from "../types/orchestrator.types";

export class OrchestratorService {
  
  async analyzePR(request: AnalyzePRRequest): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    
    try {
      console.log("🚀 Starting PR analysis pipeline...");
      
      // Step 1: Analyze code
      console.log("📊 Step 1/3: Analyzing code structure...");
      const analysisResponse = await this.callAnalysisService(request);
      console.log(`✅ Analysis complete (${Date.now() - startTime}ms)`);
      
      // Step 2: Predict failure
      console.log("🎯 Step 2/3: Predicting failure probability...");
      const predictionResponse = await this.callPredictionService(
        analysisResponse.data.predictionFeatures
      );
      console.log(`✅ Prediction complete (${Date.now() - startTime}ms)`);
      
      // Step 3: Generate review
      console.log("📝 Step 3/3: Generating review comments...");
      const reviewResponse = await this.callReviewService(
        analysisResponse.data,
        predictionResponse.data
      );
      console.log(`✅ Review complete (${Date.now() - startTime}ms)`);
      
      // Combine results
      const result = this.combineResults(
        analysisResponse.data,
        predictionResponse.data,
        reviewResponse.data
      );
      
      console.log(`🎉 Pipeline complete in ${Date.now() - startTime}ms`);
      
      return {
        success: true,
        data: result
      };
      
    } catch (error: any) {
      console.error("❌ Pipeline error:", error.message);
      
      return {
        success: false,
        error: error.message || "Pipeline failed"
      };
    }
  }
  
  private async callAnalysisService(request: AnalyzePRRequest) {
    const url = `${servicesConfig.analysis.url}${servicesConfig.analysis.endpoints.analyze}`;
    
    try {
      const response = await axios.post(url, {
        code: request.code,
        fileId: request.fileId,
        developer: request.developer,
        linesAdded: request.linesAdded,
        linesDeleted: request.linesDeleted,
        filesChanged: request.filesChanged,
        codeCoverageChange: request.codeCoverageChange,
        buildDuration: request.buildDuration,
        previousFailureRate: request.previousFailureRate
      }, {
        timeout: 30000
      });
      
      return response.data;
    } catch (error: any) {
      throw new Error(`Analysis failed: ${error.response?.data?.error || error.message}`);
    }
  }
  
  private async callPredictionService(predictionFeatures: any) {
    const url = `${servicesConfig.prediction.url}${servicesConfig.prediction.endpoints.predict}`;
    
    try {
      const response = await axios.post(url, predictionFeatures, {
        timeout: 30000
      });
      
      return response.data;
    } catch (error: any) {
      throw new Error(`Prediction failed: ${error.response?.data?.error || error.message}`);
    }
  }
  
  private async callReviewService(analysis: any, prediction: any) {
    const url = `${servicesConfig.review.url}${servicesConfig.review.endpoints.review}`;
    
    try {
      const response = await axios.post(url, {
        analysis: {
          fileId: analysis.fileId,
          metrics: analysis.metrics,
          functions: analysis.functions,
          mernPatterns: analysis.mernPatterns,
          dependencies: analysis.dependencies
        },
        prediction: {
          predicted_failure: prediction.predicted_failure,
          failure_probability: prediction.failure_probability,
          will_fail: prediction.will_fail,
          confidence: prediction.confidence
        }
      }, {
        timeout: 60000
      });
      
      return response.data;
    } catch (error: any) {
      throw new Error(`Review generation failed: ${error.response?.data?.error || error.message}`);
    }
  }
  
  private combineResults(analysis: any, prediction: any, review: any) {
    const criticalIssuesCount = review.issues.filter(
      (issue: any) => issue.severity === "critical" || issue.severity === "high"
    ).length;
    
    const canMerge = 
      review.shouldMerge && 
      prediction.failure_probability < 0.7 &&
      criticalIssuesCount === 0;
    
    const requiresReview = 
      prediction.failure_probability > 0.4 ||
      criticalIssuesCount > 0 ||
      analysis.metrics.cyclomaticComplexity > 15;
    
    return {
      fileId: analysis.fileId,
      timestamp: new Date().toISOString(),
      
      analysis: {
        metrics: analysis.metrics,
        mernPatterns: analysis.mernPatterns,
        dependencies: analysis.dependencies,
        warnings: analysis.warnings || []
      },
      
      prediction: {
        predicted_failure: prediction.predicted_failure,
        failure_probability: prediction.failure_probability,
        will_fail: prediction.will_fail,
        confidence: prediction.confidence,
        recommendation: prediction.recommendation
      },
      
      review: {
        summary: review.summary,
        riskLevel: review.riskLevel,
        shouldMerge: review.shouldMerge,
        issues: review.issues,
        recommendations: review.recommendations,
        codeQuality: review.codeQuality
      },
      
      overall: {
        canMerge,
        requiresReview,
        criticalIssuesCount
      }
    };
  }
}

export const orchestratorService = new OrchestratorService();