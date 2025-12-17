// prediction.types.ts

export interface PredictionInput {
  // Original ML features
  timestamp: string;
  developer?: string;
  module_type?: string;
  lines_added?: number;
  lines_deleted?: number;
  files_changed?: number;
  avg_function_complexity?: number;
  code_coverage_change?: number;
  build_duration?: number;
  contains_test_changes?: number;
  previous_failure_rate?: number;

  // NEW: Original code for deep analysis
  originalCode?: string;
  fileId?: string;
  
  // NEW: Full codebase context (like code analysis service receives)
  repoContext?: Array<{ path: string; content: string }>;
  
  // Structural data from analysis service
  functions?: string[];
  imports?: string[];
  
  // Metrics from analysis service
  metrics?: {
    totalLines?: number;
    cyclomaticComplexity?: number;
    functionCount?: number;
    avgFunctionLength?: number;
    complexityRating?: string;
    importCount?: number;
  };
  
  // MERN patterns from analysis service
  mernPatterns?: {
    hasErrorHandling?: boolean;
    hasValidation?: boolean;
    usesMongoDB?: boolean;
    usesExpress?: boolean;
    potentialIssues?: string[];
    hasAsyncFunctions?: boolean;
    asyncFunctionCount?: number;
    hasPromises?: boolean;
    hasUnhandledPromises?: boolean;
    usesRouterModules?: boolean;
    hasCentralizedErrorMiddleware?: boolean;
    usesStatusCodesCorrectly?: boolean;
    usesMongoose?: boolean;
    hasSchemaValidation?: boolean;
    hasIndexesDefined?: boolean;
    usesLeanQueries?: boolean;
    validatesRequestBody?: boolean;
    validatesQueryParams?: boolean;
    [key: string]: any; // Allow additional pattern properties
  };
  
  // Dependencies from graph analysis
  dependencies?: {
    direct?: string[];
    reverse?: string[];
    hasCycles?: boolean;
    impactRadius?: {
      affects?: string[];
      impactedBy?: string[];
    };
  };
  
  // Context: Available scope information
  context?: {
    availableInScope?: {
      variables: string[];
      functions: string[];
      hooks: string[];
      imports: string[];
    };
    externalDeps?: {
      npm: string[];
      internal: string[];
    };
    propsAvailable?: {
      names?: string[];
      types?: Record<string, any>;
    };
  };
  
  // Actual issues detected by static analysis
  actualIssues?: {
    undefinedVariables?: Array<{
      name: string;
      line?: number;
      context?: string;
    }>;
    undefinedFunctions?: Array<{
      name: string;
      line?: number;
      suggestion?: string;
    }>;
    missingImports?: Array<{
      identifier: string;
      requiredFrom: string;
      line?: number;
    }>;
    syntaxErrors?: Array<{
      message: string;
      line?: number;
      context?: string;
    }>;
    nullSafetyIssues?: Array<{
      variable: string;
      accessPath: string;
      line?: number;
      reason: string;
    }>;
    unhandledPromises?: Array<{
      functionCall: string;
      line?: number;
      reason: string;
    }>;
    typeMismatches?: Array<{
      message: string;
      line?: number;
      context?: string;
    }>;
  };
  
  // Warnings and recommendations
  warnings?: string[];
  recommendations?: Array<{
    category?: string;
    priority?: string;
    message?: string;
    details?: string;
  }>;
  
  // Similar patterns from embeddings
  similarPatterns?: Array<{
    id: string;
    score?: number;
    similarityScore?: number;
    metadata?: any;
  }>;
  
  // Quality score
  qualityScore?: number;
}

export interface PredictionResult {
  predicted_failure: number;
  failure_probability: number;
  reasoning?: string;
  confidence?: string;
  will_fail?: boolean;
  recommendation?: string;
  failure_points?: string[];
}

export interface PredictionHistory {
  id: string;
  timestamp: Date;
  developer: string;
  moduleType: string;
  predictedFailure: boolean;
  failureProbability: number;
  avgFunctionComplexity: number;
  createdAt: Date;
}

export interface PredictionResult {
  predicted_failure: number;
  failure_probability: number;
  reasoning?: string;
  confidence?: string;
  will_fail?: boolean;
  recommendation?: string;
  failure_points?: string[];
}

export interface PredictionStats {
  totalPredictions: number;
  failedPredictions: number;
  successRate: string;
  avgFailureProbability: string;
}