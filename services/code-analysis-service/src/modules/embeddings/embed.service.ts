import { embedIndex } from "../../utils/pinecone";
import { CohereClient } from "cohere-ai";
import crypto from "crypto";

/* ================================
   Cohere Client
================================ */
export const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY!,
});

/* ================================
   Utils
================================ */
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hashText(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/* ================================
   Semaphore (CONCURRENCY CONTROL)
   This is the MOST IMPORTANT FIX
================================ */
class Semaphore {
  private active = 0;
  private queue: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async acquire() {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    await new Promise<void>(resolve => this.queue.push(resolve));
    this.active++;
  }

  release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

// Only ONE Cohere request at a time
const embedSemaphore = new Semaphore(1);

/* ================================
   Embedding Service
================================ */
export class EmbeddingService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 5000;

  /* ------------------------------
     Single embedding (safe)
  ------------------------------ */
  async generateEmbedding(
    text: string,
    retries = this.MAX_RETRIES
  ): Promise<number[] | null> {
    await embedSemaphore.acquire();

    try {
      console.log("Generating embedding with Cohere...");

      const response = await cohere.embed({
        texts: [text],
        model: "embed-english-v3.0",
        inputType: "search_document",
        embeddingTypes: ["float"],
      });

      let embedding: number[];

      if (Array.isArray(response.embeddings)) {
        embedding = response.embeddings[0];
      } else if (response.embeddings?.float) {
        embedding = response.embeddings.float[0];
      } else {
        throw new Error("Unexpected embedding response format");
      }

      console.log(`Generated ${embedding.length}-dimensional embedding`);
      return embedding;

    } catch (err: any) {
      if (err?.statusCode === 429 && retries > 0) {
        console.warn("Cohere rate limit hit, retrying...");
        await sleep(this.RETRY_DELAY_MS);
        return this.generateEmbedding(text, retries - 1);
      }

      if (err?.statusCode === 429) {
        console.warn("Skipping embedding due to persistent rate limit");
        return null; // SOFT FAIL
      }

      console.error("Embedding generation failed:", err);
      throw err;

    } finally {
      embedSemaphore.release();
    }
  }

  /* ------------------------------
     Batch embedding (preferred)
  ------------------------------ */
  async generateEmbeddings(
    texts: string[],
    retries = this.MAX_RETRIES
  ): Promise<number[][] | null> {
    await embedSemaphore.acquire();

    try {
      console.log(`Generating ${texts.length} embeddings (batch)...`);

      const response = await cohere.embed({
        texts,
        model: "embed-english-v3.0",
        inputType: "search_document",
        embeddingTypes: ["float"],
      });

      if (Array.isArray(response.embeddings)) {
        return response.embeddings;
      }

      if (response.embeddings?.float) {
        return response.embeddings.float;
      }

      throw new Error("Unexpected embedding response format");

    } catch (err: any) {
      if (err?.statusCode === 429 && retries > 0) {
        console.warn("Cohere rate limit hit (batch), retrying...");
        await sleep(this.RETRY_DELAY_MS);
        return this.generateEmbeddings(texts, retries - 1);
      }

      if (err?.statusCode === 429) {
        console.warn("Skipping batch embedding due to persistent rate limit");
        return null;
      }

      console.error("Batch embedding failed:", err);
      throw err;

    } finally {
      embedSemaphore.release();
    }
  }

  /* ------------------------------
     Store embedding (cached)
  ------------------------------ */
  async storeEmbedding(id: string, text: string) {
    const hash = hashText(text);

    // Cache check
    const existing = await embedIndex.fetch([hash]);

if (existing.records && existing.records[hash]) {
  console.log("Embedding already exists, using cache");
  return { id: hash, stored: false, cached: true };
}


    const vector = await this.generateEmbedding(text);
    if (!vector) {
      return { id: hash, stored: false, skipped: true };
    }

    await embedIndex.upsert([
      {
        id: hash,
        values: vector,
        metadata: {
          source: "code",
          originalId: id,
          length: text.length,
        },
      },
    ]);

    return { id: hash, stored: true, cached: false };
  }

  /* ------------------------------
     Similarity search
  ------------------------------ */
  async searchSimilar(text: string, topK = 5) {
    const vector = await this.generateEmbedding(text);
    if (!vector) return [];

    const results = await embedIndex.query({
      vector,
      topK,
      includeMetadata: true,
    });

    return results.matches ?? [];
  }
}

export const embedService = new EmbeddingService();
