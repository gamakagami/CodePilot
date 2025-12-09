import { Router } from "express";
import { getAnalyticsSummary } from "./analytics.controller";
import authMiddleware from "../../middleware/auth";

const router = Router();

router.get("/", authMiddleware, getAnalyticsSummary);

export default router;