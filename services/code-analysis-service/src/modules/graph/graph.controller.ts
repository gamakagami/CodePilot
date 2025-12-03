import { Request, Response } from "express";
import { GraphService } from "./graph.service";

const graphService = new GraphService();

export class GraphController {
  static async register(req: Request, res: Response) {
    const { file } = req.body;
    if (!file) return res.status(400).json({ error: "file is required" });

    const result = await graphService.registerFile(file);
    return res.json(result);
  }

  static async link(req: Request, res: Response) {
    const { source, target, type } = req.body;

    if (!source || !target || !type) {
      return res.status(400).json({ error: "source, target, type required" });
    }

    const result = await graphService.linkDependency(source, target, type);
    res.json(result);
  }

  static async dependencies(req: Request, res: Response) {
    const file = req.params.file;
    const result = await graphService.getDependencies(file);
    return res.json(result);
  }

  static async reverseDependencies(req: Request, res: Response) {
    const file = req.params.file;
    const result = await graphService.getReverseDependencies(file);
    return res.json(result);
  }

  static async cycles(req: Request, res: Response) {
    const file = req.params.file;
    const result = await graphService.detectCycles(file);
    return res.json(result);
  }

  static async impact(req: Request, res: Response) {
    const file = req.params.file;
    const result = await graphService.impactAnalysis(file);
    return res.json(result);
  }
}
