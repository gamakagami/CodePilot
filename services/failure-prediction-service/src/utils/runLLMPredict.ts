import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Sanitizes analysis data to remove sensitive information before sending to LLM
 * Only sends metadata and patterns, never actual code content
 */
function sanitizeAnalysis(analysis: any): any {
  return {
    // File metadata (safe)
    fileType: analysis.fileType || "unknown",
    fileExtension: analysis.fileName?.split('.').pop() || "unknown",
    changeType: analysis.changeType || "unknown",
    
    // Metrics (safe - just numbers)
    linesAdded: analysis.lines_added || 0,
    linesDeleted: analysis.lines_deleted || 0,
    filesChanged: analysis.files_changed || 0,
    avgFunctionComplexity: analysis.avg_function_complexity || 0,
    
    // Boolean flags about code patterns (safe - no actual code)
    hasUndefinedVariables: Boolean(analysis.undefinedVariables?.length),
    undefinedVariableCount: analysis.undefinedVariables?.length || 0,
    
    hasSyntaxErrors: Boolean(analysis.syntaxErrors?.length),
    syntaxErrorCount: analysis.syntaxErrors?.length || 0,
    
    hasTypeErrors: Boolean(analysis.typeErrors?.length),
    typeErrorCount: analysis.typeErrors?.length || 0,
    
    hasUnusedImports: Boolean(analysis.unusedImports?.length),
    unusedImportCount: analysis.unusedImports?.length || 0,
    
    // Module/dependency info (safe - just counts and types)
    moduleType: analysis.module_type || "general",
    dependencyCount: analysis.dependencies?.length || 0,
    
    // Test info (safe)
    containsTestChanges: Boolean(analysis.contains_test_changes),
    codeCoverageChange: analysis.code_coverage_change || 0,
    
    // Historical context (safe - aggregated data)
    previousFailureRate: analysis.previous_failure_rate || 0,
    buildDuration: analysis.build_duration || 0,
    
    // Pattern flags (derived, not raw code)
    hasBreakingChanges: Boolean(analysis.breakingChanges),
    hasAPIChanges: Boolean(analysis.apiChanges),
    hasSchemaChanges: Boolean(analysis.schemaChanges),
    
    // Error pattern types (not actual error messages)
    errorPatterns: analysis.syntaxErrors?.map((e: any) => ({
      type: e.type || "unknown",
      severity: e.severity || "unknown"
    })) || []
  };
}

export async function runLLMPredict(analysis: any): Promise<any> {
  // Sanitize the input data
  const sanitizedData = sanitizeAnalysis(analysis);
  
  const prompt = `You are a code analyzer that predicts if MERN stack code changes will cause failures.

SANITIZED ANALYSIS DATA (no source code included):
${JSON.stringify(sanitizedData, null, 2)}

IMPORTANT - FILE TYPE CLASSIFICATION:
First, identify if this is executable MERN stack code or a non-code file:

EXECUTABLE CODE FILES (analyze for failures):
- JavaScript/TypeScript files (.js, .ts, .jsx, .tsx)
- React components
- Node.js/Express backend code
- MongoDB queries and schemas
- API routes and controllers

NON-CODE FILES (always predict PASS with 0.0 probability):
- README files (.md, .txt)
- Documentation files
- Configuration files (.json, .yml, .yaml, .env examples)
- Package manifests (package.json, package-lock.json)
- Git files (.gitignore, .gitattributes)
- License files
- Text documentation

If this is a NON-CODE file, immediately return:
{"predicted_failure": 0, "failure_probability": 0.0, "reasoning": "Non-code file (documentation/config) - no runtime impact"}

YOUR TASK (for MERN stack code only):
Analyze the METADATA and determine if it indicates a likely runtime failure.

WHAT COUNTS AS A FAILURE (predict failure_probability >= 0.5):

1. UNDEFINED VARIABLES (hasUndefinedVariables: true)
   - Strong indicator of runtime errors
   - Higher count = higher probability

2. SYNTAX/TYPE ERRORS (hasSyntaxErrors or hasTypeErrors: true)
   - Will cause immediate failures
   - Count indicates severity

3. BREAKING CHANGES (hasBreakingChanges: true)
   - API/schema changes without migration
   - High failure risk

4. HIGH COMPLEXITY + ERRORS
   - avgFunctionComplexity > 10 AND errors present
   - Indicates risky changes

5. LOW COVERAGE + CHANGES
   - codeCoverageChange < -5 with large changes
   - Reduced safety net

WHAT DOES NOT COUNT AS FAILURE (predict failure_probability < 0.5):

- High complexity alone (code still works)
- Unused imports (doesn't break runtime)
- Style issues
- Missing tests (if no errors detected)
- Small line changes without error flags

ANALYSIS APPROACH:

1. Check error flags (undefined vars, syntax, type errors)
2. If undefinedVariableCount > 0 → HIGH FAILURE RISK
3. If syntaxErrorCount > 0 → HIGH FAILURE RISK
4. If hasBreakingChanges → MEDIUM-HIGH RISK
5. If only complexity/coverage issues → LOW RISK
6. Combine multiple weak signals for overall assessment

RESPONSE FORMAT:
Return ONLY a JSON object on a single line:

{"predicted_failure": 0 or 1, "failure_probability": 0.0-1.0, "reasoning": "Brief single-line explanation"}

RULES:
- predicted_failure = 1 if failure_probability >= 0.5
- predicted_failure = 0 if failure_probability < 0.5
- If hasUndefinedVariables or hasSyntaxErrors → ALWAYS predict failure
- If hasBreakingChanges → predict failure (0.6-0.8)
- If only complexity/unused imports → predict pass
- When uncertain → predict pass (0.2-0.3 probability)
- Return ONLY the JSON object on ONE LINE
- NO line breaks in reasoning field

Now analyze the metadata and make your prediction:`;

  const response = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content.find(b => b.type === "text");
  if (!block || !("text" in block)) {
    throw new Error("No valid text block returned from Claude");
  }

  try {
    // Extract and clean the response text
    let text = block.text.trim();
    
    console.log("Raw LLM Response:", text);
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    
    // Clean up control characters and excess whitespace in the entire response
    text = text
      .replace(/[\n\r\t]/g, ' ')  // Replace newlines, returns, tabs with spaces
      .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
      .trim();
    
    // Try to find JSON object in the text
    const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (!jsonMatch) {
      throw new Error(`No JSON object found in response: ${text.substring(0, 200)}...`);
    }
    
    let jsonStr = jsonMatch[0];
    
    // Additional cleaning for the JSON string
    // Fix common issues with quotes and control characters
    jsonStr = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')  // Remove control characters
      .replace(/\s+/g, ' ')  // Normalize whitespace again
      .trim();
    
    console.log("Cleaned JSON string:", jsonStr);
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate the response has required fields
    if (typeof parsed.predicted_failure === 'undefined' || 
        typeof parsed.failure_probability === 'undefined') {
      throw new Error('Response missing required fields');
    }
    
    return parsed;
    
  } catch (err: any) {
    console.error("Full LLM Response:", block.text);
    console.error("Parse error:", err.message);
    
    // Return a safe fallback
    return {
      predicted_failure: 0,
      failure_probability: 0.3,
      reasoning: "Failed to parse LLM response, defaulting to pass"
    };
  }
}