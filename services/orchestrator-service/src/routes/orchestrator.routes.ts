import { Router } from "express";
import { orchestratorController } from "../controllers/orchestrator.controller";
import { feedbackController } from "../controllers/feedback.controller";
import { analyticsController } from "../controllers/analytics.controller";
import requireAuth from "../middleware/auth";

const router = Router();

// Main analysis endpoint
router.post("/analyze-pr", requireAuth, orchestratorController.analyzePR);

// Data retrieval endpoints
router.get("/history", requireAuth, orchestratorController.getAnalysisHistory);
router.get("/repository/:repositoryFullName", requireAuth, orchestratorController.getRepositoryAnalyses);
router.get("/metrics/history", requireAuth, orchestratorController.getMetricsHistory);
router.get("/baseline-metrics", requireAuth, orchestratorController.getBaselineMetrics);

// Feedback endpoints
router.post("/feedback", requireAuth, feedbackController.submitFeedback);
router.get("/feedback", requireAuth, feedbackController.getFeedback);

// Analytics endpoints
router.get("/analytics", requireAuth, analyticsController.getUserAnalytics);
router.post("/analytics/recalculate", requireAuth, analyticsController.recalculateAnalytics);

export default router;