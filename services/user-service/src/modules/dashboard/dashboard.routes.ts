import { Router } from "express";
import { getDashboardSummary } from "./dashboard.controller";
import authMiddleware from "../../middleware/auth";

const router = Router();

router.get("/", authMiddleware, getDashboardSummary);

export default router;
