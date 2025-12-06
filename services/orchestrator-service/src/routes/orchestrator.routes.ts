import { Router } from "express";
import { orchestratorController } from "../controllers/orchestrator.controller";

const router = Router();

router.post("/analyze-pr", orchestratorController.analyzePR);

export default router;