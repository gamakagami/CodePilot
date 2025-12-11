import { Request, Response } from "express";
import { getDashboardData } from "./dashboard.service";

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const metrics = await getDashboardData(userId);
    return res.json(metrics);
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    return res.status(500).json({ error: "Failed to load dashboard metrics" });
  }
};
