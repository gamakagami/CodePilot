import { Router } from "express";
import {
  redirectToGitHub,
  githubCallback,
  getCurrentUser
} from "../controllers/auth.controller";
import requireAuth from "../middleware/requireAuth";

const router = Router();

// Step 1: redirect to GitHub
router.get("/github", redirectToGitHub);

// Step 2: GitHub OAuth callback
router.get("/github/callback", githubCallback);

// Get current user with JWT
router.get("/me", requireAuth, getCurrentUser);

export default router;
