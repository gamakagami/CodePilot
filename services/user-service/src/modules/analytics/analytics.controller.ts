import { Request, Response } from "express";
import * as analyticsService from "./analytics.service";

export const getAnalyticsSummary = async (req: any, res: Response) => {
  const userId = req.user.id;
  const authToken = req.headers.authorization?.split(" ")[1] || "";

  const data = await analyticsService.getAnalyticsSummary(userId, authToken);
  return res.json(data);
};