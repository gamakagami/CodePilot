import { Request, Response } from "express";
import { getAnalyticsData } from "./analytics.service";

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const analytics = await getAnalyticsData(userId);
    return res.json(analytics);
  } catch (err) {
    console.error("ANALYTICS ERROR:", err);
    return res.status(500).json({ error: "Failed to load analytics" });
  }
};
