import { Router } from "express";
import {
  redirectToGitHub,
  githubCallback,
  getCurrentUser,
} from "../controllers/auth.controller";
import requireAuth from "../middleware/requireAuth";
import { logout } from "../controllers/auth.controller";

const router = Router();

// redirect to GitHub
router.get("/github", redirectToGitHub);

// GitHub OAuth callback
router.get("/github/callback", githubCallback);

// current user with JWT
router.get("/me", requireAuth, getCurrentUser);

// Logout route
router.post("/logout", requireAuth, logout);

export default router;
