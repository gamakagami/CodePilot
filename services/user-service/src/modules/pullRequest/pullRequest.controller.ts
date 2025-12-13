import { Request, Response } from "express";
import {
  getPullRequestData,
  ratePullRequest as ratePR,
} from "./pullRequest.service";

export const getPullRequestDetails = async (req: Request, res: Response) => {
  try {
    const prId = parseInt(req.params.id);
    const userId = req.user.id;

    const data = await getPullRequestData(prId, userId);
    return res.json(data);
  } catch (err) {
    console.error("PR DETAIL ERROR:", err);
    return res
      .status(500)
      .json({ error: "Failed to load pull request details" });
  }
};

export const ratePullRequest = async (req: Request, res: Response) => {
  try {
    const prId = Number(req.params.id);
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const updated = await ratePR(prId, rating);

    return res.json({
      success: true,
      rating: updated.rating,
    });
  } catch (err) {
    console.error("RATE PR ERROR:", err);
    return res.status(500).json({ error: "Failed to rate pull request" });
  }
};
