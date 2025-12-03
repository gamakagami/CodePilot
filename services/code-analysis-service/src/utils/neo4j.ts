import neo4j from "neo4j-driver";

if (
  !process.env.NEO4J_URI ||
  !process.env.NEO4J_USER ||
  !process.env.NEO4J_PASSWORD
) {
  console.warn("⚠️ Missing Neo4j credentials in .env");
}

export const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);

export async function runQuery(query: string, params: any = {}) {
  const session = driver.session();

  try {
    const result = await session.run(query, params);
    return result;
  } catch (err) {
    console.error("Neo4j query failed:", err);
    throw new Error("Neo4j execution failed");
  } finally {
    await session.close();
  }
}