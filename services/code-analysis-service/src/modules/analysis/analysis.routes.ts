import { Router } from "express";
import controller from "./analysis.controller";

const router = Router();

router.post("/", controller.analyze);
router.post("/store-repo-context", controller.storeRepositoryContext);

export default router;
