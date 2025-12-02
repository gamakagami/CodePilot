import { Router } from "express";
import { proxyRequest } from "../utils/proxy";

const router = Router();

const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const USER_URL = process.env.USER_SERVICE_URL || "http://localhost:4002";

// AUTH
router.use("/auth", (req, res) =>
  proxyRequest(req, res, `${AUTH_URL}/auth${req.path}`)
);

// USERS
router.use("/users", (req, res) =>
  proxyRequest(req, res, `${USER_URL}/users${req.path}`)
);

// DASHBOARD
router.use("/dashboard", (req, res) =>
  proxyRequest(req, res, `${USER_URL}/dashboard${req.path}`)
);

// PULL REQUESTS
router.use("/pullrequests", (req, res) =>
  proxyRequest(req, res, `${USER_URL}/pullrequests${req.path}`)
);

// ANALYTICS
router.use("/analytics", (req, res) =>
  proxyRequest(req, res, `${USER_URL}/analytics${req.path}`)
);

export default router;
