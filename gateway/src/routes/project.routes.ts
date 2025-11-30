import { Router } from "express";
import { config } from "../config";
import { proxyRequest } from "../utils/proxy";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, (req, res) =>
  proxyRequest(req, res, `${config.services.project}`)
);

router.get("/:id", requireAuth, (req, res) =>
  proxyRequest(req, res, `${config.services.project}/${req.params.id}`)
);

export default router;
