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

export interface MERNPatterns {
  // Existing
  hasErrorHandling: boolean;
  hasValidation: boolean;
  usesMongoDB: boolean;
  usesExpress: boolean;
  potentialIssues: string[];

  // Async
  hasAsyncFunctions: boolean;
  asyncFunctionCount: number;
  hasPromises: boolean;
  hasUnhandledPromises: boolean;

  // Express
  usesRouterModules: boolean;
  hasCentralizedErrorMiddleware: boolean;
  usesStatusCodesCorrectly: boolean;

  // Mongoose
  usesMongoose: boolean;
  hasSchemaValidation: boolean;
  hasIndexesDefined: boolean;
  usesLeanQueries: boolean;

  // API Validation
  validatesRequestBody: boolean;
  validatesQueryParams: boolean;
}


export interface PredictionFeatures {
  timestamp: string;
  developer: string;
  module_type: string;
  lines_added: number;
  lines_deleted: number;
  files_changed: number;
  avg_function_complexity: number;
  code_coverage_change: number;
  build_duration: number;
  contains_test_changes: number;
  previous_failure_rate: number;
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
  mernPatterns: MERNPatterns;

  // Analysis warnings (non-critical errors)
  warnings: string[];

  // prediction features
  predictionFeatures: PredictionFeatures;
}

export interface AnalysisInput {
  code: string;
  fileId?: string;
  developer?: string;
  linesAdded?: number;
  linesDeleted?: number;
  filesChanged?: number;
  codeCoverageChange?: number;
  buildDuration?: number;
  previousFailureRate?: number;
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

  async analyze(input: AnalysisInput): Promise<CodeAnalysisResult | null> {
    const warnings: string[] = [];
    const fileId = input.fileId || `file_${Date.now()}`;
    
    console.log(`Starting analysis for ${fileId}...`);

    // Step 1: Parse code structure
    let parsed: any;
    try {
      // 🔧 FIX: Remove await - parseCode is synchronous
      // Also ensure input.code is a plain string
      const codeString = String(input.code);
      console.log(`Code type: ${typeof input.code}, length: ${codeString.length}`);
      
      parsed = this.parserService.parseCode(codeString);
      
      if (!parsed) {
        console.warn(`Failed to parse ${fileId}, skipping file`);
        return null;
      }
      console.log(`Parsed: ${parsed.functions.length} functions, ${parsed.imports.length} imports`);
    } catch (err: any) {
      console.error("Parse error:", err);
      throw new Error(`Code parsing failed: ${err.message}`);
    }

    // Step 2: Register in graph and analyze dependencies
    let dependencies: DependencyInfo;
    try {
      console.log(`Registering file in Neo4j: ${fileId}`);
      await this.graphService.registerFile(fileId);
      
      // Link imports as dependencies
      console.log(`Linking ${parsed.imports.length} imports...`);
      for (const imp of parsed.imports) {
        const importPath = this.extractImportPath(imp);
        if (importPath) {
          try {
            await this.graphService.linkDependency(fileId, importPath, "IMPORTS");
          } catch (linkErr: any) {
            console.warn(`Failed to link dependency ${importPath}:`, linkErr.message);
            warnings.push(`Failed to link dependency: ${importPath}`);
          }
        }
      }

      dependencies = await this.analyzeDependencies(fileId);
      console.log(`Graph analysis: ${dependencies.directDependencies.length} deps, cycles: ${dependencies.hasCycles}`);
    } catch (err: any) {
      console.error("Neo4j error:", err);
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
      metrics = this.calculateMetrics(input.code, parsed);
      console.log(`Metrics calculated: ${metrics.functionCount} functions, complexity: ${metrics.cyclomaticComplexity}`);
    } catch (err: any) {
      console.error("Metrics calculation error:", err);
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
      console.log(`Searching for similar patterns in Pinecone...`);
      const results = await this.embedService.searchSimilar(input.code, 5);
      similarPatterns = results.map(m => ({
        id: m.id,
        score: m.score || 0,
        metadata: m.metadata
      }));
      console.log(`Found ${similarPatterns.length} similar code patterns`);
    } catch (err: any) {
      console.error("Pinecone search error:", err);
      console.error("Full error details:", {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      warnings.push(`Similarity search unavailable: ${err.message}`);
    }

    // Step 5: Store embedding for future similarity searches
    try {
      console.log(`Storing embedding for ${fileId}...`);
      await this.embedService.storeEmbedding(fileId, input.code);
      console.log(`Stored embedding for ${fileId}`);
    } catch (err: any) {
      console.error("Pinecone storage error:", err);
      console.error("Full error details:", {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      warnings.push(`Failed to store embedding: ${err.message}`);
    }

    // Step 6: MERN-specific pattern detection
    let mernPatterns: MERNPatterns;
    try {
      mernPatterns = this.detectMERNPatterns(input.code, parsed);
      console.log(`MERN analysis: ${mernPatterns.potentialIssues.length} issues detected`);
    } catch (err: any) {
      console.error("MERN pattern detection error:", err);
      warnings.push(`MERN pattern detection failed: ${err.message}`);
      mernPatterns = this.getDefaultMERNPatterns();
    }

    // Step 7: Build prediction features
    const predictionFeatures = this.buildPredictionFeatures(
      input,
      fileId,
      metrics,
      mernPatterns,
      parsed
    );
    console.log(`Prediction features ready: module=${predictionFeatures.module_type}`);

    console.log(`Analysis complete with ${warnings.length} warnings`);

    const timestamp = new Date().toISOString();

    return {
      fileId,
      timestamp,
      ast: parsed.ast,
      functions: parsed.functions,
      imports: parsed.imports,
      metrics,
      dependencies,
      similarPatterns,
      mernPatterns,
      warnings,
      predictionFeatures
    };
  }

  /**
   * Build features ready for ML prediction
   */
  private buildPredictionFeatures(
    input: AnalysisInput,
    fileId: string,
    metrics: CodeMetrics,
    mernPatterns: MERNPatterns,
    parsed: any
  ): PredictionFeatures {
    // Detect module type
    const moduleType = this.inferModuleType(parsed.imports, mernPatterns);

    // Detect test changes
    const containsTestChanges = this.detectTestChanges(fileId, parsed.imports);

    // Use provided values or defaults
    return {
      timestamp: new Date().toISOString(),
      developer: input.developer || "unknown",
      module_type: moduleType,
      lines_added: input.linesAdded || metrics.totalLines,
      lines_deleted: input.linesDeleted || 0,
      files_changed: input.filesChanged || 1,
      avg_function_complexity: metrics.cyclomaticComplexity,
      code_coverage_change: input.codeCoverageChange || 0,
      build_duration: input.buildDuration || 0,
      contains_test_changes: containsTestChanges ? 1 : 0,
      previous_failure_rate: input.previousFailureRate || 0.1
    };
  }

  /**
   * Infer module type from imports and patterns
   */
  private inferModuleType(imports: string[], mernPatterns: MERNPatterns): string {
    const allImports = imports.join(" ").toLowerCase();

    if (mernPatterns.usesExpress || /express|router|middleware/.test(allImports)) {
      return "backend";
    }

    if (/react|vue|angular|component/.test(allImports)) {
      return "frontend";
    }

    if (mernPatterns.usesMongoDB || /mongoose|prisma|typeorm/.test(allImports)) {
      return "database";
    }

    if (/axios|fetch|api|http/.test(allImports)) {
      return "api";
    }

    if (/auth|jwt|bcrypt|passport/.test(allImports)) {
      return "auth";
    }

    return "general";
  }

  /**
   * Detect if code contains test changes
   */
  private detectTestChanges(fileId: string, imports: string[]): boolean {
    // Check if file is a test file
    if (/\.test\.|\.spec\.|__tests__|__mocks__/.test(fileId)) {
      return true;
    }

    // Check imports for test frameworks
    const testImports = imports.filter(imp =>
      /jest|mocha|chai|vitest|testing-library/.test(imp)
    );

    return testImports.length > 0;
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
      console.error("Dependency analysis error:", err);
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
      /\?/g
    ];

    let complexity = 1;
    
    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private detectMERNPatterns(code: string, parsed: any): MERNPatterns {
  const base = this.getDefaultMERNPatterns();
  const potentialIssues: string[] = [];

  const hasErrorHandling = this.checkErrorHandling(code);
  if (!hasErrorHandling) {
    potentialIssues.push("Missing try-catch in async functions");
  }

  const hasValidation = /validator|validate|joi|zod|yup/.test(code);
  if (!hasValidation && /req\.body/.test(code)) {
    potentialIssues.push("Possible missing input validation on req.body");
  }

  const usesMongoDB = /mongoose|mongodb|Schema|Model/.test(code);
  const usesExpress = /express|Router|app\.(get|post|put|delete)/.test(code);

  return {
    ...base,
    hasErrorHandling,
    hasValidation,
    usesMongoDB,
    usesExpress,
    potentialIssues
  };
}


  private checkErrorHandling(code: string): boolean {
    const asyncFunctions = code.match(/async\s+\w+[^{]*{([^}]+)}/g) || [];
    
    for (const fn of asyncFunctions) {
      if (fn.includes("await") && (!fn.includes("try") || !fn.includes("catch"))) {
        return false;
      }
    }

    return asyncFunctions.length > 0;
  }

  private extractImportPath(importStatement: string): string | null {
    const match = importStatement.match(/from\s+["']([^"']+)["']/);
    return match ? match[1] : null;
  }

  private getDefaultMERNPatterns(): MERNPatterns {
  return {
    hasErrorHandling: false,
    hasValidation: false,
    usesMongoDB: false,
    usesExpress: false,
    potentialIssues: [],

    hasAsyncFunctions: false,
    asyncFunctionCount: 0,
    hasPromises: false,
    hasUnhandledPromises: false,

    usesRouterModules: false,
    hasCentralizedErrorMiddleware: false,
    usesStatusCodesCorrectly: false,

    usesMongoose: false,
    hasSchemaValidation: false,
    hasIndexesDefined: false,
    usesLeanQueries: false,

    validatesRequestBody: false,
    validatesQueryParams: false
  };
}

}

export default new AnalysisService();