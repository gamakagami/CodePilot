import { Router } from "express";
import { getDashboardMetrics } from "./dashboard.controller";
import authMiddleware from "../../middleware/auth";

const router = Router();

router.get("/", authMiddleware, getDashboardMetrics);

export default router;
