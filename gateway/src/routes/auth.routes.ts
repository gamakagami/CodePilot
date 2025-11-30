import { Router } from "express";
import { config } from "../config";
import { proxyRequest } from "../utils/proxy";

const router = Router();

router.post("/login", (req, res) =>
  proxyRequest(req, res, `${config.services.auth}/login`)
);

router.post("/register", (req, res) =>
  proxyRequest(req, res, `${config.services.auth}/register`)
);

router.get("/me", (req, res) =>
  proxyRequest(req, res, `${config.services.auth}/me`)
);

export default router;
