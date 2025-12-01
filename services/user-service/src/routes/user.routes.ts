import { Router } from "express";
import authMiddleware from "../middleware/auth";
import { 
  getProfile,
  updateProfile,
  updateApiSettings,
  updateAiSettings
} from "../controllers/user.controller";

const router = Router();

// Profile
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

// API Integration
router.put("/settings/api", authMiddleware, updateApiSettings);

// AI / Prediction Settings
router.put("/settings/ai", authMiddleware, updateAiSettings);

export default router;
