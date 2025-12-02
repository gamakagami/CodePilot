import { Request, Response } from "express";
import * as dashboardService from "./dashboard.service";

export const getDashboardSummary = async (req: any, res: Response) => {
  const userId = req.user.id;
  const summary = await dashboardService.getDashboardSummary(userId);

  return res.json(summary);
};
