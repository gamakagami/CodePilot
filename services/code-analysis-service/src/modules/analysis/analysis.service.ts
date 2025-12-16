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

  // Variable and Reference Issues
  undefinedVariables: Array<{ name: string; line?: number; context?: string }>;
  undeclaredVariables: Array<{ name: string; line?: number; context?: string }>;
  typeErrors: Array<{ message: string; line?: number; context?: string }>;
  unusedImports: string[];
  missingImports: Array<{ name: string; usedAt: string }>;
  
  // Code Quality Issues
  nullChecks: boolean;
  optionalChaining: boolean;
  hasDestructuring: boolean;
  hasSpreadOperator: boolean;
  
  // React-specific (if detected)
  usesReact: boolean;
  missingDependencies: Array<{ hook: string; dependencies: string[] }>;
  propTypesMissing: boolean;
  
  // Node.js specific
  processEnvUsage: boolean;
  fsUsage: boolean;
  pathUsage: boolean;
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
  repoContext?: Array<{ path: string; content: string }>;
  repositoryFullName?: string; // Repository identifier to retrieve context from Neo4j
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
  let repoContext = input.repoContext || [];
  const fileId = input.fileId || `file_${Date.now()}`;
  
  console.log(`Starting analysis for ${fileId}...`);

  // Retrieve repo context from Neo4j if repositoryFullName is provided and no context was passed
  if (input.repositoryFullName && repoContext.length === 0) {
    try {
      console.log(`Retrieving repository context from Neo4j for: ${input.repositoryFullName}`);
      const storedContext = await this.graphService.getRepositoryContext(input.repositoryFullName);
      if (storedContext.length > 0) {
        repoContext = storedContext;
        console.log(`Retrieved ${storedContext.length} files from Neo4j for context`);
      } else {
        console.log(`No stored context found in Neo4j for: ${input.repositoryFullName}`);
      }
    } catch (err: any) {
      console.warn(`Failed to retrieve context from Neo4j: ${err.message}`);
      warnings.push(`Could not retrieve repository context from Neo4j: ${err.message}`);
    }
  }

  // Step 1: Parse code structure
  let parsed: any;
  try {
    let codeString = String(input.code);
    
    // Handle diff format
    const lines = codeString.split('\n');
    const isDiffFormat = lines.some(line => /^[\+\-]/.test(line.trim()) || /^@@/.test(line.trim()));
    
    if (isDiffFormat) {
      const finalLines: string[] = [];
      let inHunk = false;
      
      for (const line of lines) {
        if (/^@@/.test(line.trim())) {
          inHunk = true;
          continue;
        }
        if (/^[\+\-]{3}/.test(line.trim())) {
          continue;
        }
        
        const trimmed = line.trim();
        if (trimmed.startsWith('+') && !trimmed.startsWith('+++')) {
          finalLines.push(trimmed.substring(1));
        } else if (trimmed.startsWith('-') && !trimmed.startsWith('---')) {
          continue;
        } else if (inHunk && trimmed && !trimmed.startsWith('\\')) {
          finalLines.push(trimmed);
        }
      }
      
      codeString = finalLines.join('\n');
      console.log(`🔍 [ANALYSIS] Extracted ${finalLines.length} lines from diff format before parsing`);
    }
    
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

  // Process repo context if provided
  if (repoContext.length > 0) {
    console.log(`Processing context for ${repoContext.length} repo files...`);
    
    for (const contextFile of repoContext) {
      await this.graphService.registerFile(contextFile.path);
      await this.embedService.storeEmbedding(contextFile.path, contextFile.content);
    }
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
    
    // Handle diff format: extract final code state from GitHub unified diff
    const lines = code.split('\n');
    const isDiffFormat = lines.some(line => /^[\+\-]/.test(line.trim()) || /^@@/.test(line.trim()));
    
    let cleanCode = code;
    if (isDiffFormat) {
      // GitHub unified diff format: extract final state (context + added lines)
      const finalLines: string[] = [];
      let inHunk = false;
      
      for (const line of lines) {
        // Skip diff headers (@@ lines)
        if (/^@@/.test(line.trim())) {
          inHunk = true;
          continue;
        }
        
        // Skip file headers (+++, ---)
        if (/^[\+\-]{3}/.test(line.trim())) {
          continue;
        }
        
        const trimmed = line.trim();
        
        if (trimmed.startsWith('+') && !trimmed.startsWith('+++')) {
          // Added line - include in final code
          finalLines.push(trimmed.substring(1));
        } else if (trimmed.startsWith('-') && !trimmed.startsWith('---')) {
          // Removed line - skip it
          continue;
        } else if (inHunk && trimmed && !trimmed.startsWith('\\')) {
          // Context line (unchanged) - include in final code
          finalLines.push(trimmed);
        }
      }
      
      cleanCode = finalLines.join('\n');
      console.log(`🔍 [ANALYSIS] Detected diff format in detectMERNPatterns, extracted ${finalLines.length} lines from diff`);
    } else {
      // Clean code from diff markers if present (fallback)
      cleanCode = code.replace(/^[\+\-]\s*/gm, '').trim();
    }
    
    console.log(`🔍 [ANALYSIS] Detecting MERN patterns in code (${cleanCode.length} chars, original: ${code.length} chars)`);

    // Error handling detection
    const hasErrorHandling = this.checkErrorHandling(cleanCode);
    const asyncFunctionMatches = cleanCode.match(/async\s+(function|\w+\s*[=:]\s*\(|\([^)]*\)\s*=>)/g) || [];
    const hasAsyncFunctions = asyncFunctionMatches.length > 0;
    const asyncFunctionCount = asyncFunctionMatches.length;
    
    // Promise detection
    const hasPromises = /\.then\(|\.catch\(|Promise\.(all|race|resolve|reject)/.test(cleanCode);
    const promiseMatches = cleanCode.match(/\.then\([^)]*\)/g) || [];
    const catchMatches = cleanCode.match(/\.catch\([^)]*\)/g) || [];
    const hasUnhandledPromises = promiseMatches.length > catchMatches.length;

    // Express detection
    const usesExpress = /express|Router|app\.(get|post|put|delete|patch|use)|router\.(get|post|put|delete|patch)/.test(cleanCode);
    const usesRouterModules = /express\.Router\(\)|const\s+\w+\s*=\s*express\.Router\(\)/.test(cleanCode);
    const hasCentralizedErrorMiddleware = /app\.use\s*\(\s*\(?\s*err\s*,\s*req\s*,\s*res\s*,\s*next/.test(cleanCode);
    
    // Status code detection
    const statusCodeMatches = cleanCode.match(/\.status\s*\(\s*\d{3}\s*\)/g) || [];
    const usesStatusCodesCorrectly = usesExpress && statusCodeMatches.length > 0;

    // Validation detection
    const hasValidation = /validator|validate|joi|zod|yup|express-validator/.test(cleanCode);
    const validatesRequestBody = /req\.body/.test(cleanCode) && (hasValidation || /\.validate\(|\.isValid\(|\.schema/.test(cleanCode));
    const validatesQueryParams = /req\.query/.test(cleanCode) && hasValidation;
    
    if (!hasValidation && /req\.body/.test(cleanCode)) {
      potentialIssues.push("Possible missing input validation on req.body");
    }

    // MongoDB/Mongoose detection
    const usesMongoDB = /mongodb|MongoClient|\.collection\(/.test(cleanCode);
    const usesMongoose = /mongoose|Schema|Model|\.model\(/.test(cleanCode);
    const hasSchemaValidation = usesMongoose && /required:\s*true|\.required\(|enum:|min:|max:|validate:/.test(cleanCode);
    const hasIndexesDefined = usesMongoose && /\.index\(|index:\s*\{|unique:\s*true/.test(cleanCode);
    const usesLeanQueries = usesMongoose && /\.lean\s*\(/.test(cleanCode);

    // Security issue detection
    if (/process\.env\.[A-Z_]+/.test(cleanCode) && /password|secret|key|token/.test(cleanCode.toLowerCase()) && !/\.env/.test(cleanCode)) {
      potentialIssues.push("Possible hardcoded credentials - use environment variables");
    }
    
    if (/eval\(|Function\(|setTimeout\(|setInterval\(/.test(cleanCode) && /req\.|req\.body|req\.query/.test(cleanCode)) {
      potentialIssues.push("Possible code injection vulnerability");
    }
    
    if (/console\.(log|error|warn|debug)/.test(cleanCode)) {
      potentialIssues.push("Console statements found - consider using a logging library");
    }

    // NEW: Detect undeclared/undefined variables and references
    // Use cleanCode to analyze (without diff markers)
    const variableDetection = this.detectVariableIssues(cleanCode, parsed);
    
    console.log(`🔍 [ANALYSIS] Variable detection results:`);
    console.log(`   - Undeclared variables: ${variableDetection.undeclaredVariables.length}`);
    if (variableDetection.undeclaredVariables.length > 0) {
      console.log(`   - Found: ${variableDetection.undeclaredVariables.map(v => v.name).join(', ')}`);
    }
    console.log(`   - Undefined variables: ${variableDetection.undefinedVariables.length}`);
    console.log(`   - Type errors: ${variableDetection.typeErrors.length}`);
    
    // Code quality patterns
    const nullChecks = /=== null|!== null|== null|!= null|\?\?|\?\./.test(code);
    const optionalChaining = /\?\./.test(code);
    const hasDestructuring = /\{[^}]*\}\s*=\s*\w+|\[[^\]]*\]\s*=\s*\w+/.test(code);
    const hasSpreadOperator = /\.\.\./.test(code);
    
    // React detection
    const usesReact = /react|import.*from ['"]react['"]|useState|useEffect|useCallback/.test(code);
    const missingDependencies = this.detectMissingDependencies(code);
    const propTypesMissing = usesReact && !/PropTypes|\.propTypes/.test(code);
    
    // Node.js specific
    const processEnvUsage = /process\.env/.test(code);
    const fsUsage = /require\(['"]fs['"]\)|import.*from ['"]fs['"]/.test(code);
    const pathUsage = /require\(['"]path['"]\)|import.*from ['"]path['"]/.test(code);

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
      validatesQueryParams,
      
      // Variable and reference issues
      undefinedVariables: variableDetection.undefinedVariables,
      undeclaredVariables: variableDetection.undeclaredVariables,
      typeErrors: variableDetection.typeErrors,
      unusedImports: variableDetection.unusedImports,
      missingImports: variableDetection.missingImports,
      
      // Code quality
      nullChecks,
      optionalChaining,
      hasDestructuring,
      hasSpreadOperator,
      
      // React-specific
      usesReact,
      missingDependencies,
      propTypesMissing,
      
      // Node.js specific
      processEnvUsage,
      fsUsage,
      pathUsage
    };
  }

  /**
   * Detect variable issues: undeclared, undefined references, type errors
   */
  private detectVariableIssues(code: string, parsed: any): {
    undefinedVariables: Array<{ name: string; line?: number; context?: string }>;
    undeclaredVariables: Array<{ name: string; line?: number; context?: string }>;
    typeErrors: Array<{ message: string; line?: number; context?: string }>;
    unusedImports: string[];
    missingImports: Array<{ name: string; usedAt: string }>;
  } {
    // Handle diff format: extract final code state from GitHub unified diff
    const lines = code.split('\n');
    const isDiffFormat = lines.some(line => /^[\+\-]/.test(line.trim()) || /^@@/.test(line.trim()));
    
    let codeToAnalyze = code;
    if (isDiffFormat) {
      // GitHub unified diff format: extract final state (context + added lines)
      const finalLines: string[] = [];
      let inHunk = false;
      
      for (const line of lines) {
        // Skip diff headers (@@ lines)
        if (/^@@/.test(line.trim())) {
          inHunk = true;
          continue;
        }
        
        // Skip file headers (+++, ---)
        if (/^[\+\-]{3}/.test(line.trim())) {
          continue;
        }
        
        const trimmed = line.trim();
        
        if (trimmed.startsWith('+') && !trimmed.startsWith('+++')) {
          // Added line - include in final code
          finalLines.push(trimmed.substring(1));
        } else if (trimmed.startsWith('-') && !trimmed.startsWith('---')) {
          // Removed line - skip it
          continue;
        } else if (inHunk && trimmed && !trimmed.startsWith('\\')) {
          // Context line (unchanged) - include in final code
          finalLines.push(trimmed);
        }
      }
      
      codeToAnalyze = finalLines.join('\n');
      console.log(`🔍 [ANALYSIS] Detected diff format, extracted ${finalLines.length} lines from diff`);
      console.log(`   - Sample extracted code: ${codeToAnalyze.substring(0, 200)}...`);
    }
    
    const cleanLines = codeToAnalyze.split('\n');
    const undefinedVars: Array<{ name: string; line?: number; context?: string }> = [];
    const undeclaredVars: Array<{ name: string; line?: number; context?: string }> = [];
    const typeErrors: Array<{ message: string; line?: number; context?: string }> = [];
    const unusedImports: string[] = [];
    const missingImports: Array<{ name: string; usedAt: string }> = [];
    
    // Extract declared variables (const, let, var, function parameters, imports)
    const declaredVars = new Set<string>();
    const importedNames = new Set<string>();
    
    // Extract imports
    const importMatches = codeToAnalyze.matchAll(/import\s+(?:\{([^}]+)\}|(\w+)|(\w+)\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      if (match[1]) {
        // Named imports: import { a, b } from 'x'
        const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
        names.forEach(n => {
          declaredVars.add(n);
          importedNames.add(n);
        });
      } else if (match[2]) {
        // Default import: import x from 'y'
        declaredVars.add(match[2]);
        importedNames.add(match[2]);
      } else if (match[3] && match[4]) {
        // Alias import: import x as y from 'z'
        declaredVars.add(match[4]);
        importedNames.add(match[4]);
      }
    }
    
    // Clean code from diff markers if present
    const cleanCode = code.replace(/^[\+\-]\s*/gm, '').trim();
    
    // Extract variable declarations (const, let, var)
    const varDeclarations = cleanCode.matchAll(/(?:const|let|var)\s+(\w+)/g);
    for (const match of varDeclarations) {
      declaredVars.add(match[1]);
    }
    
    // Extract array destructuring (React hooks: const [state, setState] = useState())
    const arrayDestructuring = cleanCode.matchAll(/(?:const|let|var)\s*\[([^\]]+)\]\s*=/g);
    for (const match of arrayDestructuring) {
      const vars = match[1].split(',').map(v => v.trim().split(/[:=]/)[0].trim());
      vars.forEach(v => {
        if (v && !v.includes('...')) declaredVars.add(v);
      });
    }
    
    // Extract object destructuring: const { prop1, prop2 } = obj
    const objectDestructuring = cleanCode.matchAll(/(?:const|let|var)\s*\{([^}]+)\}\s*=/g);
    for (const match of objectDestructuring) {
      const vars = match[1].split(',').map(v => v.trim().split(/[:=]/)[0].trim());
      vars.forEach(v => {
        if (v && !v.includes('...')) declaredVars.add(v);
      });
    }
    
    // Extract function parameters
    const functionParams = cleanCode.matchAll(/(?:function\s+\w+\s*\(|\(|\w+\s*[:=]\s*(?:async\s+)?\(|=>\s*\()([^)]*)\)/g);
    for (const match of functionParams) {
      const params = match[1].split(',').map(p => p.trim().split(/[:=]/)[0].trim());
      params.forEach(p => {
        if (p && !p.includes('...')) declaredVars.add(p);
      });
    }
    
    // Extract function declarations
    const functionDecls = cleanCode.matchAll(/(?:function|async\s+function)\s+(\w+)/g);
    for (const match of functionDecls) {
      declaredVars.add(match[1]);
    }
    
    // Extract class declarations
    const classDecls = cleanCode.matchAll(/class\s+(\w+)/g);
    for (const match of classDecls) {
      declaredVars.add(match[1]);
    }
    
    // Extract React component declarations: const Component = () => {}
    const componentDecls = cleanCode.matchAll(/(?:const|let|var)\s+([A-Z][a-zA-Z0-9_$]*)\s*[:=]/g);
    for (const match of componentDecls) {
      declaredVars.add(match[1]);
    }
    
    // Now scan for variable usage (already cleaned)
    cleanLines.forEach((line, index) => {
      // Skip comments and strings
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
      
      // Skip empty lines
      if (!line.trim()) return;
      
      // Find variable references (improved pattern to catch JSX and arrow functions)
      // Match identifiers that are not part of strings or comments
      const varRefs = line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g);
      for (const match of varRefs) {
        const varName = match[1];
        const lineNum = index + 1;
        const matchIndex = match.index!;
        
        // Skip keywords, built-ins, and common globals
        const keywords = ['if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'undefined', 'this', 'super', 'new', 'typeof', 'instanceof', 'console', 'process', 'require', 'module', 'exports', 'window', 'document', 'React', 'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'useReducer', 'import', 'export', 'default', 'from', 'as', 'const', 'let', 'var', 'function', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'class', 'extends', 'implements', 'interface', 'type'];
        if (keywords.includes(varName)) continue;
        
        // Skip if it's a property access (obj.prop) - check character before match
        const charBefore = matchIndex > 0 ? line[matchIndex - 1] : '';
        if (charBefore === '.' || /[a-zA-Z0-9_$]/.test(charBefore)) continue;
        
        // Skip if it's part of a string literal (basic check)
        const beforeMatch = line.substring(0, matchIndex);
        const stringQuotes = (beforeMatch.match(/['"]/g) || []).length;
        if (stringQuotes % 2 !== 0) continue; // Inside a string
        
        // Skip HTML/JSX element names (lowercase HTML tags)
        const htmlTags = ['div', 'span', 'button', 'input', 'form', 'nav', 'header', 'footer', 'section', 'article', 'aside', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'br', 'hr', 'label', 'select', 'option', 'textarea', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon'];
        if (htmlTags.includes(varName.toLowerCase())) continue;
        
        // Skip React component names (PascalCase) when used as JSX elements
        if (/^[A-Z]/.test(varName)) {
          const afterMatch = line.substring(matchIndex + varName.length);
          // If it's followed by whitespace or >, it's likely a JSX element, not a variable
          if (afterMatch.match(/^\s*>|^\s*\/>|^\s*</)) {
            continue; // JSX element, skip
          }
          // If it's followed by ( or . or [, it's being used as a variable/function
          if (!afterMatch.match(/^\s*\(|^\s*\.|^\s*\[/)) {
            // Might be a component reference, skip unless clearly a variable
            continue;
          }
        }
        
        // Check if variable is used but not declared
        if (!declaredVars.has(varName)) {
          const afterMatch = line.substring(matchIndex + varName.length);
          const isMethodCall = afterMatch.match(/^\s*\(/);
          
          // Check if it's inside JSX attribute (onClick={() => setDark(...)})
          const isInJSXAttribute = /on\w+\s*=\s*\{/.test(beforeMatch) || 
                                   /=\s*\{/.test(beforeMatch) ||
                                   /onClick|onChange|onSubmit|onFocus|onBlur/.test(beforeMatch);
          
          // Check if it's inside an arrow function parameter or body
          const isInArrowFunction = /=>\s*/.test(beforeMatch) || /\([^)]*\)\s*=>/.test(beforeMatch);
          
          // Check if it's a React hook setter (setXxx pattern)
          const isReactSetter = /^set[A-Z]/.test(varName);
          
          // Variables used in JSX attributes, arrow functions, or React setters are definitely variable references
          if (isInJSXAttribute || (isInArrowFunction && !isMethodCall) || isReactSetter) {
            undeclaredVars.push({
              name: varName,
              line: lineNum,
              context: line.trim().substring(0, 100)
            });
          } else if (!isMethodCall) {
            // Not a method call and not declared - likely undeclared
            // But skip if it looks like a component name (PascalCase at start of expression)
            const isComponentLike = /^[A-Z]/.test(varName) && 
                                    (beforeMatch.trim().endsWith('<') || beforeMatch.trim().endsWith('return') || beforeMatch.trim() === '');
            if (!isComponentLike) {
              undeclaredVars.push({
                name: varName,
                line: lineNum,
                context: line.trim().substring(0, 100)
              });
            }
          }
        }
        
        // Check for undefined usage patterns
        if (varName === 'undefined' && !/=== undefined|!== undefined|== undefined|!= undefined/.test(line)) {
          undefinedVars.push({
            name: varName,
            line: lineNum,
            context: line.trim().substring(0, 100)
          });
        }
      }
      
      // Detect type errors (common patterns)
      if (/\.(length|map|filter|reduce|forEach)\s*\(/.test(line) && !/Array|string|object/.test(line)) {
        // Potential type error - calling array methods on non-array
        typeErrors.push({
          message: "Possible type error: calling array method on potentially non-array value",
          line: index + 1,
          context: line.trim().substring(0, 100)
        });
      }
    });
    
    // Check for unused imports
    importedNames.forEach(imp => {
      const usageRegex = new RegExp(`\\b${imp}\\b`);
      if (!usageRegex.test(code.replace(/import[^;]+;?/g, ''))) {
        unusedImports.push(imp);
      }
    });
    
    return {
      undefinedVariables: undefinedVars,
      undeclaredVariables: undeclaredVars,
      typeErrors,
      unusedImports,
      missingImports
    };
  }

  /**
   * Detect missing dependencies in React hooks
   */
  private detectMissingDependencies(code: string): Array<{ hook: string; dependencies: string[] }> {
    const missing: Array<{ hook: string; dependencies: string[] }> = [];
    
    // Find useEffect, useCallback, useMemo with empty dependency arrays
    const hookMatches = code.matchAll(/(useEffect|useCallback|useMemo)\s*\([^,]+,\s*\[\s*\]/g);
    for (const match of hookMatches) {
      missing.push({
        hook: match[1],
        dependencies: []
      });
    }
    
    return missing;
  }


  private checkErrorHandling(code: string): boolean {
  // Simple check for try-catch blocks
  const hasTryCatch = /try\s*{[\s\S]*?}\s*catch/.test(code);
  const hasAsyncAwait = /async.*await/.test(code);
  
  if (hasAsyncAwait && !hasTryCatch) {
    return false;
  }
  
  return true;
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
    validatesQueryParams: false,

    // Variable and reference issues
    undefinedVariables: [],
    undeclaredVariables: [],
    typeErrors: [],
    unusedImports: [],
    missingImports: [],
    
    // Code quality
    nullChecks: false,
    optionalChaining: false,
    hasDestructuring: false,
    hasSpreadOperator: false,
    
    // React-specific
    usesReact: false,
    missingDependencies: [],
    propTypesMissing: false,
    
    // Node.js specific
    processEnvUsage: false,
    fsUsage: false,
    pathUsage: false
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