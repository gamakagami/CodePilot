import { Router } from "express";
import authMiddleware from "../middleware/auth";
import { 
  getProfile,
  updateProfile,
  updateApiSettings,
  updateAiSettings,
  addRepository,
  addPullRequest,
  syncRepositories,
  syncSingleRepository,
  analyzePullRequest,
  submitPullRequest,
  getMetrics
} from "../controllers/user.controller";

const router = Router();

// Profile
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

// API Integration
router.put("/settings/api", authMiddleware, updateApiSettings);

// AI / Prediction Settings
router.put("/settings/ai", authMiddleware, updateAiSettings);

router.post("/repositories", authMiddleware, addRepository);
router.post("/pull-requests", authMiddleware, addPullRequest);

router.post("/repositories/sync", authMiddleware, syncRepositories);
router.post("/repositories/sync/:repoName", authMiddleware, syncSingleRepository);

router.post("/pull-requests/:prId/analyze", authMiddleware, analyzePullRequest);
router.post("/pull-requests/:prId/submit", authMiddleware, submitPullRequest);

router.get("/metrics", authMiddleware, getMetrics);

export default router;
