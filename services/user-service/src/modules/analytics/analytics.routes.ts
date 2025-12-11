import { Router } from "express";
import { getAnalytics } from "./analytics.controller";
import authMiddleware from "../../middleware/auth";

const router = Router();

router.get("/", authMiddleware, getAnalytics);

export default router;