import axios from "axios";
import { Request, Response } from "express";

export async function proxyRequest(
  req: Request,
  res: Response,
  targetUrl: string
) {
  // Check if target URL is defined
  if (!targetUrl) {
    console.error("Proxy error: Target URL is not defined");
    return res.status(500).json({
      error: "Service configuration error: AUTH_SERVICE_URL is not set"
    });
  }

  try {
    // Filter headers - exclude host and other headers that shouldn't be forwarded
    const headers: any = { ...req.headers };
    delete headers.host;
    delete headers["content-length"];

    console.log(`Proxying ${req.method} ${req.path} to ${targetUrl}`);

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers,
      params: req.query,
      timeout: 5000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Don't throw on 3xx redirects
    });

    // Handle redirects (like GitHub OAuth)
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      return res.redirect(response.status, response.headers.location);
    }

    return res.status(response.status).json(response.data);
  } catch (err: any) {
    const errorMessage = err.message || "Unknown error";
    const errorDetails = err.response?.data || errorMessage;
    
    console.error("Proxy error:", {
      url: targetUrl,
      method: req.method,
      error: errorMessage,
      response: err.response?.status,
      data: err.response?.data
    });

    // More specific error messages
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({
        error: `Cannot connect to auth-service at ${targetUrl}. Is the service running?`
      });
    }

    if (err.code === "ETIMEDOUT") {
      return res.status(504).json({
        error: "Request to auth-service timed out"
      });
    }

    return res.status(err.response?.status || 500).json({
      error: errorDetails || "Service unavailable"
    });
  }
}
