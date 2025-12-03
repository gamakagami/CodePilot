import { Pinecone } from "@pinecone-database/pinecone";

if (!process.env.PINECONE_API_KEY) {
  console.warn("⚠️ Missing PINECONE_API_KEY in .env");
}

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const embedIndex = pinecone.index(
  process.env.PINECONE_INDEX || "code-analysis"
);

/**
 * Upsert embeddings into Pinecone
 */
export async function storeEmbedding(id: string, values: number[], metadata: any) {
  try {
    await embedIndex.upsert([
      {
        id,
        values,
        metadata,
      },
    ]);

    return true;
  } catch (err) {
    console.error("Pinecone upsert error:", err);
    throw new Error("Failed to store embedding");
  }
}
