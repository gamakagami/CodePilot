import { Router } from "express";
import controller from "./analysis.controller";

const router = Router();

router.post("/", controller.analyze);

export default router;
