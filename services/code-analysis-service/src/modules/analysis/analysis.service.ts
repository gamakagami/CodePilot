import { ParserService } from "../parse/parser.service";
import { GraphService } from "../graph/graph.service";
import { EmbeddingService } from "../embeddings/embed.service";

export interface CodeMetrics {
  totalLines: number;
  functionCount: number;
  importCount: number;
  avgFunctionLength: number;
  cyclomaticComplexity: number;
}

export interface DependencyInfo {
  directDependencies: string[];
  reverseDependencies: string[];
  hasCycles: boolean;
  impactRadius: {
    affects: string[];
    impactedBy: string[];
  };
}

export interface SimilarCode {
  id: string;
  score: number;
  metadata?: any;
}

export interface CodeAnalysisResult {
  fileId: string;
  timestamp: string;
  
  // Structural analysis
  ast: string;
  functions: string[];
  imports: string[];
  
  // Metrics
  metrics: CodeMetrics;
  
  // Graph analysis
  dependencies: DependencyInfo;
  
  // Similarity search
  similarPatterns: SimilarCode[];
  
  // MERN-specific patterns
  mernPatterns: {
    hasErrorHandling: boolean;
    hasValidation: boolean;
    usesMongoDB: boolean;
    usesExpress: boolean;
    potentialIssues: string[];
  };

  // Analysis warnings (non-critical errors)
  warnings: string[];
}

class AnalysisService {
  private parserService: ParserService;
  private graphService: GraphService;
  private embedService: EmbeddingService;

  constructor() {
    this.parserService = new ParserService();
    this.graphService = new GraphService();
    this.embedService = new EmbeddingService();
  }

  async analyze(code: string, fileId: string = "temp_file"): Promise<CodeAnalysisResult> {
    const warnings: string[] = [];
    
    console.log(`🔍 Starting analysis for ${fileId}...`);

    // Step 1: Parse code structure
    let parsed: any;
    try {
      parsed = await this.parserService.parseCode(code);
      console.log(`✅ Parsed: ${parsed.functions.length} functions, ${parsed.imports.length} imports`);
    } catch (err: any) {
      console.error("❌ Parse error:", err);
      throw new Error(`Code parsing failed: ${err.message}`);
    }

    // Step 2: Register in graph and analyze dependencies
    let dependencies: DependencyInfo;
    try {
      console.log(`📊 Registering file in Neo4j: ${fileId}`);
      await this.graphService.registerFile(fileId);
      
      // Link imports as dependencies
      console.log(`🔗 Linking ${parsed.imports.length} imports...`);
      for (const imp of parsed.imports) {
        const importPath = this.extractImportPath(imp);
        if (importPath) {
          try {
            await this.graphService.linkDependency(fileId, importPath, "IMPORTS");
          } catch (linkErr: any) {
            console.warn(`⚠️ Failed to link dependency ${importPath}:`, linkErr.message);
            warnings.push(`Failed to link dependency: ${importPath}`);
          }
        }
      }

      dependencies = await this.analyzeDependencies(fileId);
      console.log(`✅ Graph analysis: ${dependencies.directDependencies.length} deps, cycles: ${dependencies.hasCycles}`);
    } catch (err: any) {
      console.error("❌ Neo4j error:", err);
      console.error("Full error details:", {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      
      warnings.push(`Graph analysis unavailable: ${err.message}`);
      dependencies = {
        directDependencies: [],
        reverseDependencies: [],
        hasCycles: false,
        impactRadius: { affects: [], impactedBy: [] }
      };
    }

    // Step 3: Calculate metrics
    let metrics: CodeMetrics;
    try {
      metrics = this.calculateMetrics(code, parsed);
      console.log(`✅ Metrics calculated: ${metrics.functionCount} functions, complexity: ${metrics.cyclomaticComplexity}`);
    } catch (err: any) {
      console.error("❌ Metrics calculation error:", err);
      warnings.push(`Metrics calculation partially failed: ${err.message}`);
      metrics = {
        totalLines: 0,
        functionCount: 0,
        importCount: 0,
        avgFunctionLength: 0,
        cyclomaticComplexity: 0
      };
    }

    // Step 4: Search for similar code patterns
    let similarPatterns: SimilarCode[] = [];
    try {
      console.log(`🔍 Searching for similar patterns in Pinecone...`);
      const results = await this.embedService.searchSimilar(code, 5);
      similarPatterns = results.map(m => ({
        id: m.id,
        score: m.score || 0,
        metadata: m.metadata
      }));
      console.log(`✅ Found ${similarPatterns.length} similar code patterns`);
    } catch (err: any) {
      console.error("❌ Pinecone search error:", err);
      console.error("Full error details:", {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      warnings.push(`Similarity search unavailable: ${err.message}`);
    }

    // Step 5: Store embedding for future similarity searches
    try {
      console.log(`💾 Storing embedding for ${fileId}...`);
      await this.embedService.storeEmbedding(fileId, code);
      console.log(`✅ Stored embedding for ${fileId}`);
    } catch (err: any) {
      console.error("❌ Pinecone storage error:", err);
      console.error("Full error details:", {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      warnings.push(`Failed to store embedding: ${err.message}`);
    }

    // Step 6: MERN-specific pattern detection
    let mernPatterns: CodeAnalysisResult['mernPatterns'];
    try {
      mernPatterns = this.detectMERNPatterns(code, parsed);
      console.log(`✅ MERN analysis: ${mernPatterns.potentialIssues.length} issues detected`);
    } catch (err: any) {
      console.error("❌ MERN pattern detection error:", err);
      warnings.push(`MERN pattern detection failed: ${err.message}`);
      mernPatterns = {
        hasErrorHandling: false,
        hasValidation: false,
        usesMongoDB: false,
        usesExpress: false,
        potentialIssues: []
      };
    }

    console.log(`✅ Analysis complete with ${warnings.length} warnings`);

    return {
      fileId,
      timestamp: new Date().toISOString(),
      ast: parsed.ast,
      functions: parsed.functions,
      imports: parsed.imports,
      metrics,
      dependencies,
      similarPatterns,
      mernPatterns,
      warnings
    };
  }

  private async analyzeDependencies(fileId: string): Promise<DependencyInfo> {
    try {
      const [deps, reverseDeps, cycles, impact] = await Promise.all([
        this.graphService.getDependencies(fileId),
        this.graphService.getReverseDependencies(fileId),
        this.graphService.detectCycles(fileId),
        this.graphService.impactAnalysis(fileId)
      ]);

      return {
        directDependencies: deps.map((d: any) => d.dependency),
        reverseDependencies: reverseDeps.map((d: any) => d.dependent),
        hasCycles: cycles.hasCycle,
        impactRadius: impact
      };
    } catch (err: any) {
      console.error("❌ Dependency analysis error:", err);
      throw new Error(`Dependency analysis failed: ${err.message}`);
    }
  }

  private calculateMetrics(code: string, parsed: any): CodeMetrics {
    const lines = code.split('\n');
    const totalLines = lines.filter(l => l.trim().length > 0).length;
    const functionCount = parsed.functions.length;
    
    let totalFunctionLines = 0;
    for (const fn of parsed.functions) {
      totalFunctionLines += fn.split('\n').length;
    }
    
    const avgFunctionLength = functionCount > 0 
      ? Math.round(totalFunctionLines / functionCount)
      : 0;

    // Simple cyclomatic complexity: count if/else/for/while/case/catch
    const complexity = this.calculateCyclomaticComplexity(code);

    return {
      totalLines,
      functionCount,
      importCount: parsed.imports.length,
      avgFunctionLength,
      cyclomaticComplexity: complexity
    };
  }

  private calculateCyclomaticComplexity(code: string): number {
    const patterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\|\|/g,
      /&&/g,
      /\?/g  // ternary operator
    ];

    let complexity = 1; // Base complexity
    
    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private detectMERNPatterns(code: string, parsed: any): CodeAnalysisResult['mernPatterns'] {
    const potentialIssues: string[] = [];

    // Check for error handling in async functions
    const hasErrorHandling = this.checkErrorHandling(code);
    if (!hasErrorHandling) {
      potentialIssues.push("Missing try-catch in async functions");
    }

    // Check for input validation
    const hasValidation = /validator|validate|joi|zod|yup/.test(code);
    if (!hasValidation && /req\.body/.test(code)) {
      potentialIssues.push("Possible missing input validation on req.body");
    }

    // Check MongoDB usage
    const usesMongoDB = /mongoose|mongodb|Schema|Model/.test(code);

    // Check Express usage
    const usesExpress = /express|Router|app\.(get|post|put|delete)/.test(code);

    // Check for SQL injection vulnerabilities (in case using raw queries)
    if (/query\(.*\$\{.*\}/.test(code) || /query\(.*\+.*\+/.test(code)) {
      potentialIssues.push("Potential SQL/NoSQL injection vulnerability");
    }

    // Check for missing status codes in responses
    if (/res\.(send|json)\(/.test(code) && !/res\.status\(\d+\)/.test(code)) {
      potentialIssues.push("Response without explicit status code");
    }

    // Check for console.log in production code
    if (/console\.log/.test(code)) {
      potentialIssues.push("Contains console.log statements (should use logger)");
    }

    // Check for hardcoded credentials
    if (/(password|apikey|secret|token)\s*=\s*["'][^"']+["']/.test(code.toLowerCase())) {
      potentialIssues.push("Possible hardcoded credentials detected");
    }

    return {
      hasErrorHandling,
      hasValidation,
      usesMongoDB,
      usesExpress,
      potentialIssues
    };
  }

  private checkErrorHandling(code: string): boolean {
    // Check if async functions have try-catch
    const asyncFunctions = code.match(/async\s+\w+[^{]*{([^}]+)}/g) || [];
    
    for (const fn of asyncFunctions) {
      if (!fn.includes('try') || !fn.includes('catch')) {
        return false;
      }
    }

    return asyncFunctions.length > 0;
  }

  private extractImportPath(importStatement: string): string | null {
    // Extract path from: import ... from "path"
    const match = importStatement.match(/from\s+["']([^"']+)["']/);
    return match ? match[1] : null;
  }
}

export default new AnalysisService();