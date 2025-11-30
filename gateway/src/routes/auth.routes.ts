import { Router } from "express";
import { config } from "../config";
import { proxyRequest } from "../utils/proxy";

const router = Router();

// GitHub OAuth flow
router.get("/github", (req, res) =>
  proxyRequest(req, res, `${config.services.auth}/auth/github`)
);

router.get("/github/callback", (req, res) =>
  proxyRequest(req, res, `${config.services.auth}/auth/github/callback`)
);

// Get current user (requires authentication)
router.get("/me", (req, res) =>
  proxyRequest(req, res, `${config.services.auth}/auth/me`)
);

export default router;
