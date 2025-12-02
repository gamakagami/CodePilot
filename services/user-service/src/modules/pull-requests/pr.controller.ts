import { Request, Response } from "express";
import * as prService from "./pr.service";

export const getUserPullRequests = async (req: any, res: Response) => {
  const userId = req.user.id;

  const prs = await prService.getUserPullRequests(userId);

  return res.json(prs);
};
