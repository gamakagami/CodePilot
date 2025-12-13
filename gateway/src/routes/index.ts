import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import requireAuth from "../middleware/auth";

const router = Router();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL!;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL!;

// AUTH SERVICE (public)
router.use(
  "/auth",
  createProxyMiddleware({
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
  createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/api/users": "/users",
    },

    on: {
      proxyReq: (proxyReq, req, res) => {
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

      proxyRes: (proxyRes, req, res) => {
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