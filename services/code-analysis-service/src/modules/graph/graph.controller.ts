import { Request, Response } from "express";
import { GraphService } from "./graph.service";

const graphService = new GraphService();

export class GraphController {
  static async register(req: Request, res: Response) {
    try {
      const { file } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: "file is required" });
      }

      const result = await graphService.registerFile(file);
      return res.json(result);
    } catch (error: any) {
      console.error("Graph register error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to register file" 
      });
    }
  }

  static async link(req: Request, res: Response) {
    try {
      const { source, target, type } = req.body;

      if (!source || !target || !type) {
        return res.status(400).json({ 
          error: "source, target, and type are required" 
        });
      }

      const result = await graphService.linkDependency(source, target, type);
      return res.json(result);
    } catch (error: any) {
      console.error("Graph link error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to link dependency" 
      });
    }
  }

  static async dependencies(req: Request, res: Response) {
    try {
      const file = req.params.file;
      
      if (!file) {
        return res.status(400).json({ error: "file parameter is required" });
      }

      const result = await graphService.getDependencies(file);
      return res.json(result);
    } catch (error: any) {
      console.error("Get dependencies error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to get dependencies" 
      });
    }
  }

  static async reverseDependencies(req: Request, res: Response) {
    try {
      const file = req.params.file;
      
      if (!file) {
        return res.status(400).json({ error: "file parameter is required" });
      }

      const result = await graphService.getReverseDependencies(file);
      return res.json(result);
    } catch (error: any) {
      console.error("Get reverse dependencies error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to get reverse dependencies" 
      });
    }
  }

  static async cycles(req: Request, res: Response) {
    try {
      const file = req.params.file;
      
      if (!file) {
        return res.status(400).json({ error: "file parameter is required" });
      }

      const result = await graphService.detectCycles(file);
      return res.json(result);
    } catch (error: any) {
      console.error("Detect cycles error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to detect cycles" 
      });
    }
  }

  static async impact(req: Request, res: Response) {
    try {
      const file = req.params.file;
      
      if (!file) {
        return res.status(400).json({ error: "file parameter is required" });
      }

      const result = await graphService.impactAnalysis(file);
      return res.json(result);
    } catch (error: any) {
      console.error("Impact analysis error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to perform impact analysis" 
      });
    }
  }
}