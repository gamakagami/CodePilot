import { Request, Response } from "express";
import { ParserService } from "./parser.service";

const parserService = new ParserService();

export class ParserController {
  static async parse(req: Request, res: Response) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ 
          error: "Missing `code` in request body" 
        });
      }

      const result = parserService.parseCode(code);
      return res.json(result);
    } catch (error: any) {
      console.error("Parse error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to parse code" 
      });
    }
  }
}