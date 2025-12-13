import { embedIndex } from "../../utils/pinecone";
import { CohereClient } from "cohere-ai";

export const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

export class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log("Generating embedding with Cohere...");

      const response = await cohere.embed({
        texts: [text],
        model: "embed-english-v3.0",
        inputType: "search_document",
        embeddingTypes: ["float"],
      });

      // Handle the response properly based on its type
      let embedding: number[];
      
      if (Array.isArray(response.embeddings)) {
        // If it's number[][], take the first array
        embedding = response.embeddings[0];
      } else if (response.embeddings && 'float' in response.embeddings) {
        // If it has a float property
        embedding = response.embeddings.float![0];
      } else {
        throw new Error("Unexpected embedding response format");
      }

      console.log(`Generated ${embedding.length}-dimensional embedding`);
      return embedding;

    } catch (err) {
      console.error("Embedding generation failed:", err);
      throw new Error("Failed generating embeddings from Cohere");
    }
  }

  async storeEmbedding(id: string, text: string) {
    const vector = await this.generateEmbedding(text);

    await embedIndex.upsert([
      {
        id,
        values: vector,
        metadata: {
          source: "code",
          length: text.length,
        },
      },
    ]);

    return { id, stored: true };
  }

  async searchSimilar(text: string, topK = 5) {
    const vector = await this.generateEmbedding(text);

    const results = await embedIndex.query({
      vector,
      topK,
      includeMetadata: true,
    });

    return results.matches;
  }
}

export const embedService = new EmbeddingService();