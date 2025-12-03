import { Router } from "express";
import { EmbedController } from "./embed.controller";

const router = Router();

router.post("/", EmbedController.embed);
router.post("/search", EmbedController.search);

export default router;
