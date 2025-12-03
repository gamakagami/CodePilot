import { Router } from "express";
import { ParserController } from "./parser.controller";

const router = Router();

router.post("/", ParserController.parse);

export default router;
