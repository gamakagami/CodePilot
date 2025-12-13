import { Router, Request, Response } from "express";
import {
  createProxyMiddleware,
  Options,
} from "http-proxy-middleware";
import { ClientRequest } from "http";

import requireAuth from "../middleware/auth";

const router = Router();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL!;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL!;

// AUTH SERVICE (public)
const authProxyOptions: Options<Request, Response> = {
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/auth": "/auth", // /api is already stripped
  },
  logger: console,
};

router.use("/auth", createProxyMiddleware(authProxyOptions));

// USER SERVICE (protected)
const userProxyOptions: Options<Request, Response> = {
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    "^/users": "/users",
  },
  onProxyReq: (
    proxyReq: ClientRequest,
    req: Request,
    res: Response
  ) => {
    console.log("→ USER SERVICE");
    console.log("URL:", req.originalUrl);
    console.log("Method:", req.method);

    if (req.headers.authorization) {
      proxyReq.setHeader("authorization", req.headers.authorization);
    }
  },
  onProxyRes: (
    proxyRes: Response,
    req: Request,
    res: Response
  ) => {
    console.log("← USER SERVICE RESPONSE:", proxyRes.statusCode);
  },
  onError: (
    err: Error,
    req: Request,
    res: Response
  ) => {
    console.error("USER PROXY ERROR:", err.message);
    if (res && !res.headersSent) {
      res.status(502).json({
        error: "Gateway → User service error",
      });
    }
  },
};

router.use("/users", requireAuth, createProxyMiddleware(userProxyOptions));

export default router;
