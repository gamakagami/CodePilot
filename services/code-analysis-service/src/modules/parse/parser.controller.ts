import { Request, Response } from "express";
import { ParserService } from "./parser.service";

const parserService = new ParserService();

export class ParserController {
  static parse(req: Request, res: Response) {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Missing `code` in request body" });
    }

    const result = parserService.parseCode(code);
    return res.json(result);
  }
}
