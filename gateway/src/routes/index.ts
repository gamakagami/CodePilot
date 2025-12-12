import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import requireAuth from "../middleware/auth";

const router = Router();

console.log("AUTH:", process.env.AUTH_SERVICE_URL);
console.log("USER:", process.env.USER_SERVICE_URL);

// ✅ AUTH SERVICE (public)
router.use(
  "/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/auth": "/auth" },
    logLevel: "debug"
  })
);

// ✅ USER SERVICE (protected)
router.use(
  "/users",
  requireAuth,
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/users": "/users" },
    logLevel: "debug",

    onProxyReq: (proxyReq, req) => {
      console.log("→ USER SERVICE");
      console.log("URL:", req.originalUrl);
      console.log("Method:", req.method);
      console.log("Headers:", req.headers);
    },

    onProxyRes: (proxyRes) => {
      console.log("← USER SERVICE RESPONSE:", proxyRes.statusCode);
    },

    onError: (err, req, res) => {
      console.error("USER PROXY ERROR:", err.message);
      res.status(500).json({ error: "Gateway → User service error" });
    }
  })
);

export default router;
