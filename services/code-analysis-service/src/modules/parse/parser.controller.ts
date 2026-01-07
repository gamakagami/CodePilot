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

      console.log(`\nReceived parse request with ${code.length} characters`);
      console.log(`First 100 chars: ${code.substring(0, 100)}...`);

      const result = parserService.parseCode(code);
      
      if (result === null) {
        return res.status(400).json({
          error: "Failed to parse code - invalid syntax or empty input"
        });
      }

      return res.json(result);
    } catch (error: any) {
      console.error("Parse error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to parse code" 
      });
    }
  }
}