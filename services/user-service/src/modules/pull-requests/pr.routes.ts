import { Router } from "express";
import { getUserPullRequests } from "./pr.controller";
import authMiddleware from "../../middleware/auth";

const router = Router();

router.get("/", authMiddleware, getUserPullRequests);

export default router;
