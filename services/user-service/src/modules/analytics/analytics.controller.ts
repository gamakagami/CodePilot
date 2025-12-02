import { Request, Response } from "express";
import * as analyticsService from "./analytics.service";

export const getRepoAnalytics = async (req: any, res: Response) => {
  const userId = req.user.id;
  const repoName = req.params.repoName;

  const data = await analyticsService.getRepoAnalytics(userId, repoName);

  return res.json(data);
};
