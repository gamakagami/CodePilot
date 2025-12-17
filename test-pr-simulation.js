/**
 * Test simulation to verify undeclared variable detection works
 * This simulates a PR with an undeclared variable
 */

// Simulated code with undeclared variable
const testCode = `
function calculateTotal(items) {
  let sum = 0;
  for (let item of items) {
    sum += item.price;
  }
  // Undeclared variable 'tax' used here
  return sum + tax;
}
`;

// Simulated analysis result
const mockAnalysis = {
  fileId: "test-file.js",
  timestamp: new Date().toISOString(),
  metrics: {
    totalLines: 8,
    functionCount: 1,
    importCount: 0,
    avgFunctionLength: 8,
    cyclomaticComplexity: 2
  },
  functions: [testCode],
  imports: [],
  dependencies: {
    directDependencies: [],
    reverseDependencies: [],
    hasCycles: false,
    impactRadius: { affects: [], impactedBy: [] }
  },
  mernPatterns: {
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
    // Simulated undeclared variable detection
    undeclaredVariables: [
      {
        name: "tax",
        line: 7,
        context: "return sum + tax;"
      }
    ],
    undefinedVariables: [],
    typeErrors: [],
    unusedImports: [],
    missingImports: [],
    nullChecks: false,
    optionalChaining: false,
    hasDestructuring: false,
    hasSpreadOperator: false,
    usesReact: false,
    missingDependencies: [],
    propTypesMissing: false,
    processEnvUsage: false,
    fsUsage: false,
    pathUsage: false
  },
  warnings: [],
  predictionFeatures: {
    timestamp: new Date().toISOString(),
    developer: "test-dev",
    module_type: "general",
    lines_added: 8,
    lines_deleted: 0,
    files_changed: 1,
    avg_function_complexity: 2,
    code_coverage_change: 0,
    build_duration: 0,
    contains_test_changes: 0,
    previous_failure_rate: 0
  }
};

// Simulated prediction
const mockPrediction = {
  will_fail: true,
  failure_probability: 0.8,
  confidence: "high",
  reasoning: "Undeclared variable 'tax' detected - will cause ReferenceError"
};

console.log("🧪 Testing PR Simulation with Undeclared Variable");
console.log("=" .repeat(60));
console.log("\n📝 Test Code:");
console.log(testCode);
console.log("\n🔍 Detected Issues:");
console.log("- Undeclared Variables:", mockAnalysis.mernPatterns.undeclaredVariables.length);
mockAnalysis.mernPatterns.undeclaredVariables.forEach(v => {
  console.log(`  • ${v.name} (line ${v.line}): ${v.context}`);
});

console.log("\n✅ Expected Review Service Behavior:");
console.log("1. Should detect undeclared variable 'tax'");
console.log("2. Should create a CRITICAL issue for it");
console.log("3. Should include it in the issues array");
console.log("4. Should mention it in the summary");

console.log("\n📋 Expected Issue Format:");
console.log(JSON.stringify({
  severity: "critical",
  category: "variable_error",
  title: "Undeclared Variable Detected",
  description: "Found 1 undeclared variable: tax",
  location: "test-file.js",
  impact: "This will cause ReferenceError at runtime",
  suggestion: "Declare this variable using const, let, or var, or import it if it is from another module"
}, null, 2));

console.log("\n" + "=".repeat(60));
console.log("✅ Test simulation complete. Verify that:");
console.log("1. Code analysis detects the undeclared variable");
console.log("2. Review service includes it in the issues");
console.log("3. LLM doesn't skip it in the response");

