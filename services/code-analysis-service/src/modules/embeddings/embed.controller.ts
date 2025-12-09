import { Request, Response } from "express";
import { EmbeddingService } from "./embed.service";

const embedService = new EmbeddingService();

export class EmbedController {
  static async embed(req: Request, res: Response) {
    try {
      const { id, code } = req.body;

      if (!id || !code) {
        return res.status(400).json({ 
          error: "`id` and `code` are required" 
        });
      }

      const result = await embedService.storeEmbedding(id, code);
      return res.json(result);
    } catch (error: any) {
      console.error("Embed error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to store embedding" 
      });
    }
  }

  static async search(req: Request, res: Response) {
    try {
      const { code, topK } = req.body;

      if (!code) {
        return res.status(400).json({ 
          error: "`code` is required" 
        });
      }

      const result = await embedService.searchSimilar(code, topK || 5);
      return res.json(result);
    } catch (error: any) {
      console.error("Search error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to search similar code" 
      });
    }
  }
}