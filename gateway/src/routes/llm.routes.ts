import { Router } from "express";
import { config } from "../config";
import { proxyRequest } from "../utils/proxy";
import { requireAuth } from "../middleware/auth";

const router = Router();

// submit prompt
router.post("/prompt", requireAuth, (req, res) =>
  proxyRequest(req, res, `${config.services.llm}/prompt`)
);

export default router;
