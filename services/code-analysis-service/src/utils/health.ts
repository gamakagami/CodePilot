import { driver as neo4jDriver } from "./neo4j";
import { embedIndex } from "./pinecone";
import { cohere } from "../modules/embeddings/embed.service";

export async function checkServiceHealth() {
  const health = {
    neo4j: false,
    pinecone: false,
    cohere: false,
    overall: false
  };

  // Check Neo4j
  try {
    const session = neo4jDriver.session();
    await session.run("RETURN 1");
    await session.close();
    health.neo4j = true;
    console.log("Neo4j connection successful");
  } catch (error: any) {
    console.error("Neo4j connection failed:", error.message);
  }

  // Check Pinecone
  try {
    await embedIndex.describeIndexStats();
    health.pinecone = true;
    console.log("Pinecone connection successful");
  } catch (error: any) {
    console.error("Pinecone connection failed:", error.message);
  }

  // Check Cohere
  if (process.env.COHERE_API_KEY) {
    health.cohere = true;
    console.log("Cohere API key configured");
  } else {
    console.warn("Cohere API key not configured");
  }

  health.overall = health.neo4j && health.pinecone;
  
  return health;
}