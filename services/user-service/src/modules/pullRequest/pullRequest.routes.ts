import { Router } from "express";
import { getPullRequestDetails, ratePullRequest } from "./pullRequest.controller";
import authMiddleware from "../../middleware/auth";

const router = Router();

router.get("/:id", authMiddleware, getPullRequestDetails);
router.post("/:id/rate", authMiddleware, ratePullRequest);

export default router;
