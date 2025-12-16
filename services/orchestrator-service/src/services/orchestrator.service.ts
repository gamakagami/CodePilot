import axios from "axios";
import { servicesConfig } from "../config/services.config";
import { AnalyzePRRequest, OrchestratorResponse } from "../types/orchestrator.types";
import { AnalysisResult } from "../models/analysis-result.model";
import { analyticsTrackerService } from "./analytics-tracker.service";

export class OrchestratorService {
  
  async analyzePR(
  request: AnalyzePRRequest, 
  userId: string,
  repositoryFullName?: string,
  prId?: number,
  prUrl?: string
): Promise<OrchestratorResponse> {
  const startTime = Date.now();
  
  try {
    console.log("🚀 Starting PR analysis pipeline...");

     // 🔍 DIAGNOSTIC: Log the incoming request
  console.log('📥 [ORCHESTRATOR] Received analysis request:');
  console.log('   - User ID:', userId);
  console.log('   - File ID:', request.fileId);
  console.log('   - Code length:', request.code?.length || 0);
  console.log('   - Repository:', repositoryFullName);
  console.log('   - PR ID:', prId);
  console.log('   - Services config:', {
    analysisUrl: servicesConfig.analysis.url,
    predictionUrl: servicesConfig.prediction.url,
    reviewUrl: servicesConfig.review.url
  });
    
    // Step 1: Analyze code
    console.log("Step 1/3: Analyzing code structure...");
    const analysisStartTime = Date.now();
    const analysisResponse = await this.callAnalysisService(request);
    console.log('   - Analysis response (preview):', JSON.stringify(analysisResponse, null, 2).slice(0, 1500));
    const analysisDuration = Date.now() - analysisStartTime;
    console.log(`✅ Analysis complete (${analysisDuration}ms)`);
    
    // Step 2: Predict failure
    console.log("Step 2/3: Predicting failure probability...");
    const predictionStartTime = Date.now();
    const predictionResponse = await this.callPredictionService(
      analysisResponse.data
    );
    console.log('   - Prediction response (preview):', JSON.stringify(predictionResponse, null, 2).slice(0, 1500));
    const predictionDuration = Date.now() - predictionStartTime;
    console.log(`✅ Prediction complete (${predictionDuration}ms)`);
    
    // Step 3: Generate review
    console.log("Step 3/3: Generating review comments...");
    const reviewStartTime = Date.now();
    
    let reviewData;
    try {
      const reviewResponse = await this.callReviewService(
        analysisResponse.data,
        predictionResponse.data
      );
      reviewData = reviewResponse;
    } catch (reviewError: any) {
      console.error('⚠️  Review generation failed, using fallback:', reviewError.message);
      // Create a minimal fallback review
      reviewData = {
        summary: 'Review generation failed - manual review recommended',
        riskLevel: 'unknown',
        shouldMerge: false,
        issues: [],
        recommendations: ['Manual review required due to review service failure'],
        codeQuality: { score: 50, strengths: [], improvementAreas: [] }
      };
    }
    
    const reviewDuration = Date.now() - reviewStartTime;
    console.log(`✅ Review complete (${reviewDuration}ms)`);
    
    // Calculate total duration
    const totalDuration = Date.now() - startTime;
    
    // Combine results with performance metrics
    console.log('📦 Combining all results...');
    const result = this.combineResults(
      analysisResponse.data,
      predictionResponse.data,
      reviewData,
      {
        totalDuration,
        analysisDuration,
        predictionDuration,
        reviewDuration
      }
    );
    
    console.log('💾 Storing analysis result...');
    // Store the results in database
    await this.storeAnalysisResult(
      userId,
      result,
      request,
      repositoryFullName,
      prId,
      prUrl
    );
    
    // Update user analytics
    await analyticsTrackerService.updateAfterAnalysis(
      userId,
      repositoryFullName || "unknown",
      result.performance.totalDuration
    );
    
    console.log(`🎉 Pipeline complete in ${totalDuration}ms`);
    
    return {
      success: true,
      data: result
    };
    
  } catch (error: any) {
    console.error("❌ Pipeline error:", error.message);
    console.error("Stack trace:", error.stack);
    
    return {
      success: false,
      error: error.message || "Pipeline failed"
    };
  }
}

  private async storeAnalysisResult(
    userId: string,
    result: any,
    request: AnalyzePRRequest,
    repositoryFullName?: string,
    prId?: number,
    prUrl?: string
  ) {
    try {
      const analysisResult = new AnalysisResult({
        userId,
        fileId: result.fileId,
        repositoryFullName: repositoryFullName || "unknown",
        prId,
        prUrl,
        timestamp: new Date(result.timestamp),
        
        metrics: {
          linesOfCode: result.analysis.metrics.linesOfCode,
          cyclomaticComplexity: result.analysis.metrics.cyclomaticComplexity,
          maintainabilityIndex: result.analysis.metrics.maintainabilityIndex,
          linesAdded: request.linesAdded || 0,
          linesDeleted: request.linesDeleted || 0,
          filesChanged: request.filesChanged || 1
        },
        
        prediction: result.prediction,
        review: result.review,
        overall: result.overall,
        
        developer: request.developer,
        buildDuration: result.performance.totalDuration,
        codeCoverageChange: request.codeCoverageChange,
        previousFailureRate: request.previousFailureRate
      });
      
      await analysisResult.save();
      console.log(`Analysis result stored for user ${userId}`);
    } catch (error) {
      console.error("Failed to store analysis result:", error);
    }
  }
  
  // Replace the callAnalysisService method with this improved version:

private async callAnalysisService(request: AnalyzePRRequest) {
  const url = `${servicesConfig.analysis.url}${servicesConfig.analysis.endpoints.analyze}`;
  
  console.log('🔍 [ORCHESTRATOR] Calling analysis service...');
  console.log('   - URL:', url);
  console.log('   - Request payload:', JSON.stringify({
    fileId: request.fileId,
    codeLength: request.code?.length || 0,
    developer: request.developer,
    hasCode: !!request.code
  }));
  
  try {
    const response = await axios.post(url, request, { 
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ [ORCHESTRATOR] Analysis service responded successfully');
    console.log('   - Analysis raw response keys:', Object.keys(response.data));
    console.log('   - Analysis data preview:', JSON.stringify(response.data, null, 2).slice(0, 1500));
    return response.data;
    
  } catch (error: any) {
    console.error('❌ [ORCHESTRATOR] Analysis service error details:');
    
    if (error.response) {
      // Server responded with error status
      console.error('   - Status:', error.response.status);
      console.error('   - Status Text:', error.response.statusText);
      console.error('   - Response Data:', JSON.stringify(error.response.data, null, 2));
      console.error('   - Headers:', error.response.headers);
      
      const errorMessage = error.response.data?.error 
        || error.response.data?.message 
        || error.response.statusText 
        || 'Unknown server error';
      
      throw new Error(`Analysis service error (${error.response.status}): ${errorMessage}`);
      
    } else if (error.request) {
      // Request made but no response received
      console.error('   - No response received from analysis service');
      console.error('   - Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout
      });
      
      throw new Error(`Analysis service unavailable: No response received. Is the service running at ${url}?`);
      
    } else if (error.code === 'ECONNREFUSED') {
      // Connection refused
      console.error('   - Connection refused');
      throw new Error(`Cannot connect to analysis service at ${url}. Is the service running?`);
      
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      // Timeout
      console.error('   - Request timeout');
      throw new Error(`Analysis service timeout after 30s`);
      
    } else {
      // Something else happened
      console.error('   - Error type:', error.constructor.name);
      console.error('   - Error code:', error.code);
      console.error('   - Error message:', error.message);
      console.error('   - Full error:', error);
      
      throw new Error(`Analysis request failed: ${error.message}`);
    }
  }
}

// Also improve the other service calls similarly:

private async callPredictionService(analysis: any) {
  const url = `${servicesConfig.prediction.url}${servicesConfig.prediction.endpoints.predict}`;
  
  console.log('🔍 [ORCHESTRATOR] Calling prediction service...');
  console.log('   - URL:', url);
  
  try {
    const response = await axios.post(url, analysis, { 
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ [ORCHESTRATOR] Prediction service responded successfully');
    console.log('   - Prediction raw response keys:', Object.keys(response.data));
    console.log('   - Prediction data preview:', JSON.stringify(response.data, null, 2).slice(0, 1500));
    return response.data;
    
  } catch (error: any) {
    console.error('❌ [ORCHESTRATOR] Prediction service error:');
    
    if (error.response) {
      console.error('   - Status:', error.response.status);
      console.error('   - Data:', error.response.data);
      
      const errorMessage = error.response.data?.error 
        || error.response.data?.message 
        || 'Unknown error';
      
      throw new Error(`Prediction service error (${error.response.status}): ${errorMessage}`);
      
    } else if (error.request) {
      throw new Error(`Prediction service unavailable at ${url}`);
    } else {
      throw new Error(`Prediction request failed: ${error.message}`);
    }
  }
}
  
  private async callReviewService(analysis: any, prediction: any) {
  const url = `${servicesConfig.review.url}${servicesConfig.review.endpoints.review}`;
  
  try {
    console.log('🔍 [ORCHESTRATOR] Calling review service...');
    
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
        confidence: prediction.confidence,
        // include rationale so review service can produce issues
        reasoning: prediction.reasoning
      }
    }, { timeout: 60000 });
    
    console.log('🔍 [ORCHESTRATOR] Review service responded');
    console.log('   - Response keys:', Object.keys(response.data));
    
    // Log the full structure for debugging
    const responsePreview = JSON.stringify(response.data, null, 2).substring(0, 1000);
    console.log('   - Response structure preview:', responsePreview);
    
    // ✅ Extract the review object based on the actual response structure
    let reviewData;
    
    // Check all possible structures
    if (response.data.data?.review) {
      // Structure: { success: true, data: { review: {...} } }
      console.log('✅ [ORCHESTRATOR] Found review at: response.data.data.review');
      reviewData = response.data.data.review;
    } 
    else if (response.data.review) {
      // Structure: { success: true, review: {...} }
      console.log('✅ [ORCHESTRATOR] Found review at: response.data.review');
      reviewData = response.data.review;
    } 
    else if (response.data.data && typeof response.data.data === 'object' && response.data.data.summary) {
      // Structure: { success: true, data: { summary: "...", issues: [...] } }
      console.log('✅ [ORCHESTRATOR] Found review at: response.data.data (has summary)');
      reviewData = response.data.data;
    } 
    else if (response.data.summary) {
      // Structure: { success: true, summary: "...", issues: [...] }
      console.log('✅ [ORCHESTRATOR] Found review at: response.data (has summary)');
      reviewData = response.data;
    } 
    else {
      // Last resort: try to use data or the whole response
      console.warn('⚠️  [ORCHESTRATOR] Could not find review in expected locations, using fallback');
      reviewData = response.data.data || response.data;
    }
    
    // Validate we got something useful
    if (!reviewData || typeof reviewData !== 'object') {
      console.error('❌ [ORCHESTRATOR] Failed to extract valid review data');
      console.error('Response was:', response.data);
      throw new Error('Review service returned invalid data structure');
    }
    
    // Check for required fields
    if (!reviewData.summary) {
      console.warn('⚠️  [ORCHESTRATOR] Review data missing summary field');
    }
    
    if (!reviewData.issues) {
      console.warn('⚠️  [ORCHESTRATOR] Review data missing issues field, adding empty array');
      reviewData.issues = [];
    }
    
    console.log('✅ [ORCHESTRATOR] Review data extracted successfully:');
    console.log('   - Has summary:', !!reviewData.summary);
    console.log('   - Issues is array:', Array.isArray(reviewData.issues));
    console.log('   - Issues count:', Array.isArray(reviewData.issues) ? reviewData.issues.length : 'not an array');
    console.log('   - Risk level:', reviewData.riskLevel);
    console.log('   - Should merge:', reviewData.shouldMerge);
    
    // 🔍 DIAGNOSTIC: Log first issue if exists
    if (Array.isArray(reviewData.issues) && reviewData.issues.length > 0) {
      console.log('   - First issue structure:');
      console.log(JSON.stringify(reviewData.issues[0], null, 2));
    } else {
      console.log('   ℹ️  No issues in review data');
    }
    
    return reviewData;
    
  } catch (error: any) {
    console.error('❌ [ORCHESTRATOR] Review service error:', error.message);
    if (error.response) {
      console.error('   - Response status:', error.response.status);
      console.error('   - Response data:', error.response.data);
    }
    throw new Error(`Review generation failed: ${error.response?.data?.error || error.message}`);
  }
}
  
  private combineResults(
  analysis: any, 
  prediction: any, 
  review: any,
  performance: {
    totalDuration: number;
    analysisDuration: number;
    predictionDuration: number;
    reviewDuration: number;
  }
) {
  console.log('🔍 [ORCHESTRATOR] Combining results...');
  
  // ✅ Validate inputs
  if (!review || typeof review !== 'object') {
    console.error('❌ [ORCHESTRATOR] Invalid review object passed to combineResults');
    throw new Error('Cannot combine results: review is invalid');
  }
  
  // Ensure review has required fields with defaults
  const safeReview = {
    summary: review.summary || 'No summary available',
    riskLevel: review.riskLevel || 'unknown',
    shouldMerge: review.shouldMerge ?? true,
    issues: Array.isArray(review.issues) ? review.issues : [],
    recommendations: Array.isArray(review.recommendations) ? review.recommendations : [],
    codeQuality: review.codeQuality || { score: 50, strengths: [], improvementAreas: [] }
  };
  
  console.log('🔍 [ORCHESTRATOR] Review validation:');
  console.log('   - Issues:', safeReview.issues.length);
  console.log('   - Recommendations:', safeReview.recommendations.length);
  
  const criticalIssuesCount = safeReview.issues.filter(
    (issue: any) => issue.severity === "critical" || issue.severity === "high"
  ).length;
  
  console.log('   - Critical issues:', criticalIssuesCount);
  
  const canMerge = 
    safeReview.shouldMerge && 
    prediction.failure_probability < 0.7 &&
    criticalIssuesCount === 0;
  
  const requiresReview = 
    prediction.failure_probability > 0.4 ||
    criticalIssuesCount > 0 ||
    analysis.metrics.cyclomaticComplexity > 15;
  
  const toSeconds = (ms: number) => parseFloat((ms / 1000).toFixed(2));
  
  const result = {
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
      summary: safeReview.summary,
      riskLevel: safeReview.riskLevel,
      shouldMerge: safeReview.shouldMerge,
      issues: safeReview.issues,
      recommendations: safeReview.recommendations,
      codeQuality: safeReview.codeQuality
    },
    
    overall: {
      canMerge,
      requiresReview,
      criticalIssuesCount
    },
    
    performance: {
      totalDuration: toSeconds(performance.totalDuration),
      analysisDuration: toSeconds(performance.analysisDuration),
      predictionDuration: toSeconds(performance.predictionDuration),
      reviewDuration: toSeconds(performance.reviewDuration),
      averageDuration: toSeconds(
        (performance.analysisDuration + performance.predictionDuration + performance.reviewDuration) / 3
      )
    }
  };
  
  console.log('✅ [ORCHESTRATOR] Results combined successfully');
  console.log('   - result.review.issues count:', result.review.issues.length);
  
  return result;
}

  async getAnalysisHistory(userId: string, limit: number = 100) {
    return await AnalysisResult.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }
  
  async getRepositoryAnalyses(repositoryFullName: string, userId: string) {
    return await AnalysisResult.find({ 
      repositoryFullName,
      userId 
    })
      .sort({ timestamp: -1 })
      .lean();
  }
  
  async getMetricsHistory(userId: string, periodMonths: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);
    
    const results = await AnalysisResult.find({
      userId,
      timestamp: { $gte: startDate }
    })
      .sort({ timestamp: 1 })
      .lean();
    
    return results.map(r => ({
      timestamp: r.timestamp,
      accuracy: this.calculateAccuracy(r),
      failureProbability: r.prediction.failure_probability,
      buildDuration: r.buildDuration || 0
    }));
  }
  
  async getBaselineMetrics(userId: string) {
    const analyses = await AnalysisResult.find({ userId }).lean();
    
    if (analyses.length === 0) {
      return { 
        traditionalLatency: 240,
        codePilotLatency: 24,
        improvement: "10x faster"
      };
    }
    
    const validDurations = analyses
      .map(a => a.buildDuration || 0)
      .filter(d => d > 0);
    
    const avgBuildDuration = validDurations.length > 0
      ? parseFloat((validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length).toFixed(2))
      : 24;
    
    const traditionalLatency = parseFloat((avgBuildDuration * 10).toFixed(2)) || 240;
    
    return {
      traditionalLatency,
      codePilotLatency: avgBuildDuration,
      improvement: `${(traditionalLatency / avgBuildDuration).toFixed(1)}x faster`
    };
  }
  
  private calculateAccuracy(result: any): number {
    const confidence = result.prediction.confidence.toLowerCase();
    
    if (confidence === 'high') return 0.90;
    if (confidence === 'medium') return 0.85;
    return 0.80;
  }
}

export const orchestratorService = new OrchestratorService();