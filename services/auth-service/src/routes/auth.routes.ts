import { Router } from "express";
import {
  redirectToGitHub,
  githubCallback,
  getCurrentUser,
  logout
} from "../controllers/auth.controller";
import requireAuth from "../middleware/requireAuth";

const router = Router();

router.get("/github", redirectToGitHub);
router.get("/github/callback", githubCallback);
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", requireAuth, logout);

export default router;
