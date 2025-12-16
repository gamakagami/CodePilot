import neo4j from "neo4j-driver";
import { driver as neo4jDriver } from "../../utils/neo4j";

export class GraphService {
  private session() {
    return neo4jDriver.session();
  }

  /**
   * Register a single file
   */
  async registerFile(filePath: string, metadata?: { 
    language?: string; 
    lines?: number;
    lastModified?: string;
  }) {
    const session = this.session();
    try {
      await session.run(
        `
        MERGE (f:File {path: $filePath})
        SET f.language = $language,
            f.lines = $lines,
            f.lastModified = $lastModified,
            f.updatedAt = datetime()
        RETURN f
        `,
        { 
          filePath,
          language: metadata?.language || null,
          lines: metadata?.lines || null,
          lastModified: metadata?.lastModified || null
        }
      );
      return { file: filePath, status: "registered" };
    } finally {
      await session.close();
    }
  }

  /**
   * Register multiple files in batch (more efficient)
   */
  async registerFilesBatch(files: Array<{ 
    path: string; 
    metadata?: { 
      language?: string; 
      lines?: number;
      lastModified?: string;
    } 
  }>) {
    const session = this.session();
    try {
      await session.run(
        `
        UNWIND $files AS file
        MERGE (f:File {path: file.path})
        SET f.language = file.language,
            f.lines = file.lines,
            f.lastModified = file.lastModified,
            f.updatedAt = datetime()
        RETURN count(f) as registered
        `,
        { 
          files: files.map(f => ({
            path: f.path,
            language: f.metadata?.language || null,
            lines: f.metadata?.lines || null,
            lastModified: f.metadata?.lastModified || null
          }))
        }
      );
      return { filesRegistered: files.length, status: "success" };
    } finally {
      await session.close();
    }
  }

  /**
   * Link a single dependency
   */
  async linkDependency(source: string, target: string, type: string) {
    const session = this.session();
    try {
      await session.run(
        `
        MERGE (a:File {path: $source})
        MERGE (b:File {path: $target})
        MERGE (a)-[r:DEPENDS_ON {type: $type}]->(b)
        SET r.updatedAt = datetime()
        RETURN a, r, b
        `,
        { source, target, type }
      );

      return { from: source, to: target, type };
    } finally {
      await session.close();
    }
  }

  /**
   * Link multiple dependencies in batch (more efficient)
   */
  async linkDependenciesBatch(dependencies: Array<{
    source: string;
    target: string;
    type: string;
  }>) {
    const session = this.session();
    try {
      await session.run(
        `
        UNWIND $dependencies AS dep
        MERGE (a:File {path: dep.source})
        MERGE (b:File {path: dep.target})
        MERGE (a)-[r:DEPENDS_ON {type: dep.type}]->(b)
        SET r.updatedAt = datetime()
        RETURN count(r) as linked
        `,
        { dependencies }
      );

      return { dependenciesLinked: dependencies.length, status: "success" };
    } finally {
      await session.close();
    }
  }

  /**
   * Clear all dependencies for a file (useful before re-analyzing)
   */
  async clearFileDependencies(filePath: string) {
    const session = this.session();
    try {
      await session.run(
        `
        MATCH (f:File {path: $filePath})-[r:DEPENDS_ON]->()
        DELETE r
        RETURN count(r) as deleted
        `,
        { filePath }
      );
      return { status: "cleared" };
    } finally {
      await session.close();
    }
  }

  /**
   * Get direct dependencies of a file
   */
  async getDependencies(filePath: string) {
    const session = this.session();
    try {
      const result = await session.run(
        `
        MATCH (a:File {path: $filePath})-[r:DEPENDS_ON]->(b:File)
        RETURN b.path AS dependency, r.type AS type
        ORDER BY b.path
        `,
        { filePath }
      );

      return result.records.map((rec) => rec.toObject());
    } finally {
      await session.close();
    }
  }

  /**
   * Get reverse dependencies (who depends on this file)
   */
  async getReverseDependencies(filePath: string) {
    const session = this.session();
    try {
      const result = await session.run(
        `
        MATCH (a:File)-[r:DEPENDS_ON]->(b:File {path: $filePath})
        RETURN a.path AS dependent, r.type AS type
        ORDER BY a.path
        `,
        { filePath }
      );

      return result.records.map((rec) => rec.toObject());
    } finally {
      await session.close();
    }
  }

  /**
   * Detect circular dependencies
   */
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

  /**
   * Detect all circular dependencies in the repository
   */
  async detectAllCycles() {
    const session = this.session();
    try {
      const result = await session.run(
        `
        MATCH path = (f:File)-[:DEPENDS_ON*]->(f)
        RETURN DISTINCT [node in nodes(path) | node.path] AS cycle
        LIMIT 10
        `
      );

      return result.records.map(rec => rec.get("cycle"));
    } finally {
      await session.close();
    }
  }

  /**
   * Impact analysis: what files does this file affect?
   */
  async impactAnalysis(filePath: string) {
    const session = this.session();
    try {
      const outbound = await session.run(
        `
        MATCH (a:File {path: $filePath})-[:DEPENDS_ON*]->(b:File)
        RETURN DISTINCT b.path AS affected
        ORDER BY b.path
        `,
        { filePath }
      );

      const inbound = await session.run(
        `
        MATCH (a:File)-[:DEPENDS_ON*]->(b:File {path: $filePath})
        RETURN DISTINCT a.path AS impacts
        ORDER BY a.path
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

  /**
   * Get repository statistics
   */
  async getRepositoryStats() {
    const session = this.session();
    try {
      const result = await session.run(
        `
        MATCH (f:File)
        OPTIONAL MATCH (f)-[r:DEPENDS_ON]->()
        RETURN 
          count(DISTINCT f) as totalFiles,
          count(r) as totalDependencies,
          avg(size((f)-[:DEPENDS_ON]->())) as avgDependenciesPerFile
        `
      );

      const record = result.records[0];
      return {
        totalFiles: record.get("totalFiles").toNumber(),
        totalDependencies: record.get("totalDependencies").toNumber(),
        avgDependenciesPerFile: record.get("avgDependenciesPerFile")
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get most connected files (files with most dependencies)
   */
  async getMostConnectedFiles(limit: number = 10) {
    const session = this.session();
    try {
      const result = await session.run(
        `
        MATCH (f:File)
        OPTIONAL MATCH (f)-[out:DEPENDS_ON]->()
        OPTIONAL MATCH ()-[in:DEPENDS_ON]->(f)
        WITH f, count(DISTINCT out) as outgoing, count(DISTINCT in) as incoming
        RETURN f.path as file, outgoing, incoming, (outgoing + incoming) as total
        ORDER BY total DESC
        LIMIT $limit
        `,
        { limit: neo4j.int(limit) }
      );

      return result.records.map(rec => ({
        file: rec.get("file"),
        outgoing: rec.get("outgoing").toNumber(),
        incoming: rec.get("incoming").toNumber(),
        total: rec.get("total").toNumber()
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Delete a file and all its relationships
   */
  async deleteFile(filePath: string) {
    const session = this.session();
    try {
      await session.run(
        `
        MATCH (f:File {path: $filePath})
        DETACH DELETE f
        RETURN count(f) as deleted
        `,
        { filePath }
      );
      return { status: "deleted" };
    } finally {
      await session.close();
    }
  }

  /**
   * Clear entire repository graph (use with caution!)
   */
  async clearRepository() {
    const session = this.session();
    try {
      await session.run(
        `
        MATCH (f:File)
        DETACH DELETE f
        RETURN count(f) as deleted
        `
      );
      return { status: "cleared" };
    } finally {
      await session.close();
    }
  }

  /**
   * Store repository context (files with content) in Neo4j
   * Links files to a repository node for easy retrieval
   */
  async storeRepositoryContext(
    repositoryFullName: string,
    files: Array<{ path: string; content: string }>
  ) {
    const session = this.session();
    try {
      // Create or update repository node
      await session.run(
        `
        MERGE (r:Repository {fullName: $repositoryFullName})
        SET r.updatedAt = datetime(),
            r.fileCount = $fileCount
        RETURN r
        `,
        {
          repositoryFullName,
          fileCount: neo4j.int(files.length)
        }
      );

      // Store files with content and link to repository
      // Note: Neo4j has a property size limit, so we'll store content as a property
      // For very large files, consider storing only a hash or summary
      const batchSize = 100; // Process in batches to avoid memory issues
      let stored = 0;

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        await session.run(
          `
          UNWIND $files AS file
          MERGE (r:Repository {fullName: $repositoryFullName})
          MERGE (f:File {path: file.path})
          SET f.content = file.content,
              f.updatedAt = datetime(),
              f.lines = CASE WHEN file.content IS NOT NULL 
                THEN size(split(file.content, '\n')) 
                ELSE NULL END
          MERGE (r)-[:CONTAINS]->(f)
          RETURN count(f) as stored
          `,
          {
            repositoryFullName,
            files: batch.map(f => ({
              path: f.path,
              content: f.content || null // Store content, but handle nulls
            }))
          }
        );
        
        stored += batch.length;
      }

      return { 
        repository: repositoryFullName, 
        filesStored: stored, 
        status: "success" 
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Get repository context (all files with content) from Neo4j
   */
  async getRepositoryContext(repositoryFullName: string): Promise<Array<{ path: string; content: string }>> {
    const session = this.session();
    try {
      const result = await session.run(
        `
        MATCH (r:Repository {fullName: $repositoryFullName})-[:CONTAINS]->(f:File)
        RETURN f.path AS path, f.content AS content
        ORDER BY f.path
        `,
        { repositoryFullName }
      );

      return result.records.map(rec => ({
        path: rec.get("path"),
        content: rec.get("content") || ""
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Clear repository context (delete all files for a repository)
   */
  async clearRepositoryContext(repositoryFullName: string) {
    const session = this.session();
    try {
      const result = await session.run(
        `
        MATCH (r:Repository {fullName: $repositoryFullName})-[:CONTAINS]->(f:File)
        DETACH DELETE f
        WITH r
        DELETE r
        RETURN count(f) as deleted
        `,
        { repositoryFullName }
      );

      const deleted = result.records[0]?.get("deleted")?.toNumber() || 0;
      return { 
        repository: repositoryFullName, 
        filesDeleted: deleted, 
        status: "cleared" 
      };
    } finally {
      await session.close();
    }
  }
}