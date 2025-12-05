import { Router } from "express";
import { predictionController } from "./prediction.controller";

const router = Router();

router.post("/", (req, res) => predictionController.predict(req, res));

export default router;
