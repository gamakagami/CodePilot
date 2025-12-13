import { Router, Request, Response } from "express";
import {
  createProxyMiddleware,
  Options,
} from "http-proxy-middleware";
import { IncomingMessage } from "http";
import requireAuth from "../middleware/auth";

const router = Router();

console.log("AUTH:", process.env.AUTH_SERVICE_URL);
console.log("USER:", process.env.USER_SERVICE_URL);

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL!;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL!;


const authProxyOptions: Options = {
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/auth": "/auth" },
  logger: console,
};

router.use(
  "/auth",
  createProxyMiddleware(authProxyOptions)
);


const userProxyOptions: Options = {
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { "^/api/users": "/users" },

  onProxyReq: (proxyReq, req: Request) => {
    console.log("→ USER SERVICE");
    console.log("URL:", req.originalUrl);
    console.log("Method:", req.method);
    console.log("Headers:", req.headers);

    if (req.headers.authorization) {
      proxyReq.setHeader(
        "authorization",
        req.headers.authorization
      );
    }
  },

  onProxyRes: (proxyRes: IncomingMessage) => {
    console.log(
      "← USER SERVICE RESPONSE:",
      proxyRes.statusCode
    );
  },

  onError: (
    err: Error,
    req: Request,
    res: Response
  ) => {
    console.error(
      "USER PROXY ERROR:",
      err.message
    );
    res.status(502).json({
      error: "Gateway → User service error",
    });
  },
};

router.use(
  "/users",
  requireAuth,
  createProxyMiddleware(userProxyOptions)
);

export default router;
