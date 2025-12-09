import { Request, Response } from "express";
import * as dashboardService from "./dashboard.service";

export const getDashboardSummary = async (req: any, res: Response) => {
  const userId = req.user.id;
  const authToken = req.headers.authorization?.split(" ")[1] || "";
  
  const summary = await dashboardService.getDashboardSummary(userId, authToken);
  return res.json(summary);
};