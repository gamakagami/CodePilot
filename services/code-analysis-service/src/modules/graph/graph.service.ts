import neo4j from "neo4j-driver";
import { driver as neo4jDriver } from "../../utils/neo4j";

export class GraphService {
  private session() {
    return neo4jDriver.session();
  }

  async registerFile(filePath: string) {
    const session = this.session();
    try {
      await session.run(
        `
        MERGE (f:File {path: $filePath})
        RETURN f
        `,
        { filePath }
      );
      return { file: filePath, status: "registered" };
    } finally {
      await session.close();
    }
  }

  async linkDependency(source: string, target: string, type: string) {
    const session = this.session();
    try {
      await session.run(
        `
        MERGE (a:File {path: $source})
        MERGE (b:File {path: $target})
        MERGE (a)-[r:DEPENDS_ON {type: $type}]->(b)
        RETURN a, r, b
        `,
        { source, target, type }
      );

      return { from: source, to: target, type };
    } finally {
      await session.close();
    }
  }

  async getDependencies(filePath: string) {
    const session = this.session();
    try {
      const result = await session.run(
        `
        MATCH (a:File {path: $filePath})-[r:DEPENDS_ON]->(b:File)
        RETURN b.path AS dependency, r.type AS type
        `,
        { filePath }
      );

      return result.records.map((rec) => rec.toObject());
    } finally {
      await session.close();
    }
  }

  async getReverseDependencies(filePath: string) {
    const session = this.session();
    try {
      const result = await session.run(
        `
        MATCH (a:File)-[r:DEPENDS_ON]->(b:File {path: $filePath})
        RETURN a.path AS dependent, r.type AS type
        `,
        { filePath }
      );

      return result.records.map((rec) => rec.toObject());
    } finally {
      await session.close();
    }
  }

  async detectCycles(filePath: string) {
    const session = this.session();
    try {
      const result = await session.run(
        `
        MATCH path = (f:File {path: $filePath})-[:DEPENDS_ON*]->(f)
        RETURN path LIMIT 1
        `,
        { filePath }
      );

      return { hasCycle: result.records.length > 0 };
    } finally {
      await session.close();
    }
  }

  async impactAnalysis(filePath: string) {
    const session = this.session();
    try {
      const outbound = await session.run(
        `
        MATCH (a:File {path: $filePath})-[:DEPENDS_ON*]->(b:File)
        RETURN DISTINCT b.path AS affected
        `,
        { filePath }
      );

      const inbound = await session.run(
        `
        MATCH (a:File)-[:DEPENDS_ON*]->(b:File {path: $filePath})
        RETURN DISTINCT a.path AS impacts
        `,
        { filePath }
      );

      return {
        affects: outbound.records.map((r) => r.get("affected")),
        impactedBy: inbound.records.map((r) => r.get("impacts")),
      };
    } finally {
      await session.close();
    }
  }
}
