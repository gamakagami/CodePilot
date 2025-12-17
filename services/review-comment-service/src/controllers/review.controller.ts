import { Request, Response } from "express";
import { reviewService } from "../services/review.service";

export const reviewController = {
  async generateReview(req: Request, res: Response) {
    try {
      console.log('🔍 [REVIEW CONTROLLER] Received request');
      
      const { analysis, prediction, code, repoContext } = req.body;

      if (!analysis || !prediction) {
        console.error('❌ [REVIEW CONTROLLER] Missing required fields');
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: analysis and prediction'
        });
      }

      console.log('🔍 [REVIEW CONTROLLER] Request data:');
      console.log('   - Analysis fileId:', analysis.fileId);
      console.log('   - Prediction will_fail:', prediction.will_fail);
      console.log('   - Prediction failure_probability:', prediction.failure_probability);
      console.log('   - Prediction reasoning:', prediction.reasoning);
      console.log('   - Code provided:', !!code, code ? `(${code.length} chars)` : '');
      console.log('   - Repo context provided:', !!repoContext, repoContext ? `(${repoContext.length} files)` : '');

      console.log('🔍 [REVIEW CONTROLLER] Calling review service...');
      
      const review = await reviewService.generateReview({
        analysis,
        prediction,
        code, // Pass code for testing
        repoContext // Pass full codebase context
      });


      console.log('🔍 [REVIEW CONTROLLER] Review received from service:');
      console.log('   - Has summary:', !!review.summary);
      console.log('   - Has issues:', !!review.issues);
      console.log('   - Issues is array:', Array.isArray(review.issues));
      console.log('   - Issues count:', review.issues?.length || 0);
      
      if (review.issues && review.issues.length > 0) {
        console.log('   - First issue:', JSON.stringify(review.issues[0], null, 2));
      } else {
        console.log('   ⚠️  NO ISSUES IN REVIEW!');
      }

      // IMPORTANT: Return a simple structure the orchestrator can pick up easily
      // Provide both top-level `review` and nested `data.review` for compatibility.
      const response = {
        success: true,
        review,
        data: {
          review
        }
      };

      console.log('🔍 [REVIEW CONTROLLER] Sending response with structure:');
      console.log('   - response.data.review.issues.length:', response.data.review.issues?.length || 0);

      return res.status(200).json(response);

    } catch (error: any) {
      console.error('❌ [REVIEW CONTROLLER] Error:', error.message);
      console.error('Stack:', error.stack);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate review'
      });
    }
  }
};
