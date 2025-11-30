import { Router } from "express";
import { config } from "../config";
import { proxyRequest } from "../utils/proxy";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/:id", requireAuth, (req, res) =>
  proxyRequest(req, res, `${config.services.task}/${req.params.id}`)
);

export default router;
