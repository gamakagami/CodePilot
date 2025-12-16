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

export interface Recommendation {
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  message: string;
  details: string;
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

  // Recommendations for improvement
  recommendations: Recommendation[];
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

    // Step 8: Build recommendations for code improvement
    let recommendations: Recommendation[];
    try {
      recommendations = this.buildRecommendations(mernPatterns, metrics, dependencies);
      console.log(`Generated ${recommendations.length} recommendations`);
    } catch (err: any) {
      console.error("Recommendation generation error:", err);
      warnings.push(`Recommendation generation failed: ${err.message}`);
      recommendations = [];
    }

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
      predictionFeatures,
      recommendations
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

    // Error handling detection
    const hasErrorHandling = this.checkErrorHandling(code);
    const asyncFunctionMatches = code.match(/async\s+(function|\w+\s*[=:]\s*\(|\([^)]*\)\s*=>)/g) || [];
    const hasAsyncFunctions = asyncFunctionMatches.length > 0;
    const asyncFunctionCount = asyncFunctionMatches.length;
    
    // Promise detection
    const hasPromises = /\.then\(|\.catch\(|Promise\.(all|race|resolve|reject)/.test(code);
    const promiseMatches = code.match(/\.then\([^)]*\)/g) || [];
    const catchMatches = code.match(/\.catch\([^)]*\)/g) || [];
    const hasUnhandledPromises = promiseMatches.length > catchMatches.length;

    // Express detection
    const usesExpress = /express|Router|app\.(get|post|put|delete|patch|use)|router\.(get|post|put|delete|patch)/.test(code);
    const usesRouterModules = /express\.Router\(\)|const\s+\w+\s*=\s*express\.Router\(\)/.test(code);
    const hasCentralizedErrorMiddleware = /app\.use\s*\(\s*\(?\s*err\s*,\s*req\s*,\s*res\s*,\s*next/.test(code);
    
    // Status code detection
    const statusCodeMatches = code.match(/\.status\s*\(\s*\d{3}\s*\)/g) || [];
    const usesStatusCodesCorrectly = usesExpress && statusCodeMatches.length > 0;

    // Validation detection
    const hasValidation = /validator|validate|joi|zod|yup|express-validator/.test(code);
    const validatesRequestBody = /req\.body/.test(code) && (hasValidation || /\.validate\(|\.isValid\(|\.schema/.test(code));
    const validatesQueryParams = /req\.query/.test(code) && hasValidation;
    
    if (!hasValidation && /req\.body/.test(code)) {
      potentialIssues.push("Possible missing input validation on req.body");
    }

    // MongoDB/Mongoose detection
    const usesMongoDB = /mongodb|MongoClient|\.collection\(/.test(code);
    const usesMongoose = /mongoose|Schema|Model|\.model\(/.test(code);
    const hasSchemaValidation = usesMongoose && /required:\s*true|\.required\(|enum:|min:|max:|validate:/.test(code);
    const hasIndexesDefined = usesMongoose && /\.index\(|index:\s*\{|unique:\s*true/.test(code);
    const usesLeanQueries = usesMongoose && /\.lean\s*\(/.test(code);

    // Security issue detection
    if (/process\.env\.[A-Z_]+/.test(code) && /password|secret|key|token/.test(code.toLowerCase()) && !/\.env/.test(code)) {
      potentialIssues.push("Possible hardcoded credentials - use environment variables");
    }
    
    if (/eval\(|Function\(|setTimeout\(|setInterval\(/.test(code) && /req\.|req\.body|req\.query/.test(code)) {
      potentialIssues.push("Possible code injection vulnerability");
    }
    
    if (/console\.(log|error|warn|debug)/.test(code)) {
      potentialIssues.push("Console statements found - consider using a logging library");
    }

    return {
      ...base,
      hasErrorHandling,
      hasValidation,
      usesMongoDB,
      usesExpress,
      potentialIssues,
      
      // Async patterns
      hasAsyncFunctions,
      asyncFunctionCount,
      hasPromises,
      hasUnhandledPromises,
      
      // Express patterns
      usesRouterModules,
      hasCentralizedErrorMiddleware,
      usesStatusCodesCorrectly,
      
      // Mongoose patterns
      usesMongoose,
      hasSchemaValidation,
      hasIndexesDefined,
      usesLeanQueries,
      
      // Validation patterns
      validatesRequestBody,
      validatesQueryParams
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

  /**
   * Build actionable recommendations based on analysis results
   */
  private buildRecommendations(
    patterns: MERNPatterns,
    metrics: CodeMetrics,
    dependencies: DependencyInfo
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Error handling recommendations
    if (!patterns.hasErrorHandling && patterns.hasAsyncFunctions) {
      recommendations.push({
        category: "error_handling",
        priority: "high",
        message: "Add try-catch blocks to async functions",
        details: `Found ${patterns.asyncFunctionCount} async functions without proper error handling`
      });
    }

    if (patterns.hasUnhandledPromises) {
      recommendations.push({
        category: "error_handling",
        priority: "high",
        message: "Handle promise rejections",
        details: "Unhandled promises can crash your application"
      });
    }

    // Validation recommendations
    if (!patterns.hasValidation) {
      recommendations.push({
        category: "validation",
        priority: "high",
        message: "Add input validation",
        details: "Use libraries like Joi, Zod, or express-validator"
      });
    }

    if (!patterns.validatesRequestBody) {
      recommendations.push({
        category: "validation",
        priority: "medium",
        message: "Validate request body parameters",
        details: "Prevent invalid data from reaching your business logic"
      });
    }

    // Express recommendations
    if (patterns.usesExpress && !patterns.hasCentralizedErrorMiddleware) {
      recommendations.push({
        category: "express",
        priority: "medium",
        message: "Implement centralized error handling middleware",
        details: "Use app.use((err, req, res, next) => {...}) at the end of middleware chain"
      });
    }

    if (patterns.usesExpress && !patterns.usesStatusCodesCorrectly) {
      recommendations.push({
        category: "express",
        priority: "low",
        message: "Use explicit HTTP status codes",
        details: "Always call res.status(code) before sending responses"
      });
    }

    if (patterns.usesExpress && !patterns.usesRouterModules) {
      recommendations.push({
        category: "express",
        priority: "low",
        message: "Consider using Express Router for better organization",
        details: "Split routes into separate modules using express.Router()"
      });
    }

    // MongoDB/Mongoose recommendations
    if (patterns.usesMongoose && !patterns.hasSchemaValidation) {
      recommendations.push({
        category: "database",
        priority: "medium",
        message: "Add schema validation to Mongoose models",
        details: "Use built-in validators like required, min, max, enum"
      });
    }

    if (patterns.usesMongoose && !patterns.hasIndexesDefined) {
      recommendations.push({
        category: "database",
        priority: "medium",
        message: "Define indexes for frequently queried fields",
        details: "Improve query performance with proper indexing"
      });
    }

    if (patterns.usesMongoDB && !patterns.usesLeanQueries) {
      recommendations.push({
        category: "database",
        priority: "low",
        message: "Consider using .lean() for read-only queries",
        details: "Improve performance by returning plain JavaScript objects"
      });
    }

    // Complexity recommendations
    if (metrics.cyclomaticComplexity > 20) {
      recommendations.push({
        category: "code_quality",
        priority: "high",
        message: "Reduce cyclomatic complexity",
        details: `Complexity is ${metrics.cyclomaticComplexity} (very high). Consider breaking down complex functions into smaller, more manageable pieces.`
      });
    } else if (metrics.cyclomaticComplexity > 10) {
      recommendations.push({
        category: "code_quality",
        priority: "medium",
        message: "Consider reducing cyclomatic complexity",
        details: `Complexity is ${metrics.cyclomaticComplexity} (high). Simplify logic or extract helper functions.`
      });
    }

    // Dependency cycle recommendations
    if (dependencies.hasCycles) {
      recommendations.push({
        category: "architecture",
        priority: "high",
        message: "Resolve circular dependencies",
        details: "Circular dependencies can lead to tight coupling and make code harder to maintain. Refactor to break the cycle."
      });
    }

    // Large function recommendations
    if (metrics.avgFunctionLength > 50) {
      recommendations.push({
        category: "code_quality",
        priority: "medium",
        message: "Functions are too long on average",
        details: `Average function length is ${metrics.avgFunctionLength} lines. Consider breaking large functions into smaller, single-purpose functions.`
      });
    }

    // Security recommendations from potentialIssues
    for (const issue of patterns.potentialIssues) {
      let priority: "critical" | "high" | "medium" | "low" = "medium";
      let category = "general";

      if (issue.includes("injection")) {
        priority = "critical";
        category = "security";
      } else if (issue.includes("credentials")) {
        priority = "critical";
        category = "security";
      } else if (issue.includes("console.log")) {
        priority = "low";
        category = "logging";
      }

      recommendations.push({
        category,
        priority,
        message: issue,
        details: this.getIssueDetails(issue)
      });
    }

    return recommendations;
  }

  /**
   * Get detailed explanation for specific issues
   */
  private getIssueDetails(issue: string): string {
    const detailsMap: { [key: string]: string } = {
      "injection": "Parameterize queries and use ORM methods to prevent injection attacks",
      "credentials": "Move sensitive data to environment variables using .env files",
      "console.log": "Use a proper logging library like Winston or Pino",
      "validation": "Validate all user inputs before processing",
      "status code": "Be explicit about HTTP status codes for better API clarity"
    };

    for (const [key, details] of Object.entries(detailsMap)) {
      if (issue.toLowerCase().includes(key)) {
        return details;
      }
    }

    return "Review and address this issue to improve code quality";
  }

}

export default new AnalysisService();