import { Router } from "express";
import { GraphController } from "./graph.controller";

const router = Router();

router.post("/register", GraphController.register);
router.post("/link", GraphController.link);
router.get("/dependencies/:file", GraphController.dependencies);
router.get("/reverse-dependencies/:file", GraphController.reverseDependencies);
router.get("/cycles/:file", GraphController.cycles);
router.get("/impact/:file", GraphController.impact);

export default router;