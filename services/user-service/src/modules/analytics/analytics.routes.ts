import { Router } from "express";
import { getRepoAnalytics } from "./analytics.controller";
import authMiddleware from "../../middleware/auth";

const router = Router();

router.get("/:repoName", authMiddleware, getRepoAnalytics);

export default router;
