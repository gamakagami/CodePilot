// Type definitions for code analysis results
// This matches the CodeAnalysisResult interface from code-analysis-service

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
  hasErrorHandling: boolean;
  hasValidation: boolean;
  usesMongoDB: boolean;
  usesExpress: boolean;
  potentialIssues: string[];
  hasAsyncFunctions: boolean;
  asyncFunctionCount: number;
  hasPromises: boolean;
  hasUnhandledPromises: boolean;
  usesRouterModules: boolean;
  hasCentralizedErrorMiddleware: boolean;
  usesStatusCodesCorrectly: boolean;
  usesMongoose: boolean;
  hasSchemaValidation: boolean;
  hasIndexesDefined: boolean;
  usesLeanQueries: boolean;
  validatesRequestBody: boolean;
  validatesQueryParams: boolean;
  undefinedVariables: Array<{ name: string; line?: number; context?: string }>;
  undeclaredVariables: Array<{ name: string; line?: number; context?: string }>;
  typeErrors: Array<{ message: string; line?: number; context?: string }>;
  unusedImports: string[];
  missingImports: Array<{ name: string; usedAt: string }>;
  nullChecks: boolean;
  optionalChaining: boolean;
  hasDestructuring: boolean;
  hasSpreadOperator: boolean;
  usesReact: boolean;
  missingDependencies: Array<{ hook: string; dependencies: string[] }>;
  propTypesMissing: boolean;
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

export interface CodeAnalysisResult {
  fileId: string;
  timestamp: string;
  ast: string;
  functions: string[];
  imports: string[];
  metrics: CodeMetrics;
  dependencies: DependencyInfo;
  similarPatterns: SimilarCode[];
  mernPatterns: MERNPatterns;
  warnings: string[];
  predictionFeatures: PredictionFeatures;
  recommendations?: any[];
}
