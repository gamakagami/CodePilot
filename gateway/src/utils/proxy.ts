import axios from "axios";
import { Request, Response } from "express";

export async function proxyRequest(
  req: Request,
  res: Response,
  targetUrl: string
) {
  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: req.headers,
      params: req.query,
      timeout: 5000
    });

    return res.status(response.status).json(response.data);
  } catch (err: any) {
    console.error("Proxy error:", err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      error: err.response?.data || "Service unavailable"
    });
  }
}
