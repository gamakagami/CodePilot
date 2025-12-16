import { Router } from "express";
import { predictionController } from "./prediction.controller";

const router = Router();

router.post("/", (req, res) => predictionController.predict(req, res));
router.get("/history/:developer", (req, res) =>
  predictionController.getHistory(req, res)
);
router.get("/stats", (req, res) => predictionController.getStats(req, res));

export default router;