import { Request, Response } from "express";
import { EmbeddingService } from "./embed.service";

const embedService = new EmbeddingService();

export class EmbedController {
  static async embed(req: Request, res: Response) {
    try {
      const { id, code } = req.body;

      if (!id || !code) {
        return res.status(400).json({ error: "`id` and `code` required" });
      }

      const result = await embedService.storeEmbedding(id, code);
      return res.json(result);

    } catch (err: any) {
      console.error("Embed error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  static async search(req: Request, res: Response) {
    try {
      const { code, topK } = req.body;

      if (!code) {
        return res.status(400).json({ error: "`code` required" });
      }

      const result = await embedService.searchSimilar(code, topK);
      return res.json(result);

    } catch (err: any) {
      console.error("Search error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
}
