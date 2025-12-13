import { Router, Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import requireAuth from "../middleware/auth";

const router = Router();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL!;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL!;

// AUTH SERVICE (public)
router.use(
  "/auth",
  createProxyMiddleware<Request, Response>({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/api/auth": "/auth",
    },
    logger: console,
  })
);

// USER SERVICE (protected)
router.use(
  "/users",
  requireAuth,
  createProxyMiddleware<Request, Response>({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/api/users": "/users",
    },

    // Fixed: callbacks are now under 'on' object
    on: {
      proxyReq: (proxyReq, req) => {
        console.log("→ USER SERVICE");
        console.log("URL:", req.originalUrl);
        console.log("Method:", req.method);

        if (req.headers.authorization) {
          proxyReq.setHeader(
            "authorization",
            req.headers.authorization
          );
        }
      },

      proxyRes: (proxyRes) => {
        console.log(
          "← USER SERVICE RESPONSE:",
          proxyRes.statusCode
        );
      },

      error: (err, req, res) => {
        console.error("USER PROXY ERROR:", err.message);
        if (res && !res.headersSent) {
          res.status(502).json({
            error: "Gateway → User service error",
          });
        }
      },
    },
  })
);

export default router;