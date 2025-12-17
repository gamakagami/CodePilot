import Anthropic from "@anthropic-ai/sdk";

function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    console.warn("[failure-prediction] ANTHROPIC_API_KEY not set");
    return null;
  }
  try {
    return new Anthropic({ apiKey });
  } catch (err: any) {
    console.error("[failure-prediction] Client init failed:", err?.message);
    return null;
  }
}

const client = createAnthropicClient();

/**
 * Clean diff format to extract final code state
 */
function cleanDiffFormat(diff: string): string {
  const lines = diff.split('\n');
  const cleanLines: string[] = [];
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
      // Added line - include without the + prefix
      const cleanedLine = line.substring(line.indexOf('+') + 1);
      cleanLines.push(cleanedLine);
    } else if (trimmed.startsWith('-') && !trimmed.startsWith('---')) {
      // Removed line - skip it
      continue;
    } else if (inHunk && trimmed && !trimmed.startsWith('\\')) {
      // Context line (unchanged) - include as-is
      cleanLines.push(line);
    }
  }
  
  const result = cleanLines.join('\n');
  console.log(`[failure-prediction] Cleaned diff: ${lines.length} lines → ${cleanLines.length} lines`);
  return result;
}

/**
 * Extract actual code content from payload for analysis
 */
function extractCodeForAnalysis(payload: any): string {
  if (payload.originalCode) {
    const code = payload.originalCode;
    
    // Check if it's a diff format (contains @@ or lines starting with +/-)
    const isDiff = code.includes('@@') || /^[\+\-]\s/m.test(code);
    
    if (isDiff) {
      console.log("[failure-prediction] Detected diff format, extracting clean code...");
      return cleanDiffFormat(code);
    }
    
    console.log("[failure-prediction] Using original code as-is");
    return code;
  }
  
  // Fallback: reconstruct from structure (legacy)
  console.log("[failure-prediction] No originalCode, reconstructing from structure...");
  const structure = payload.structure || {};
  const functions = structure.functions || [];
  const imports = structure.imports || [];
  
  // Combine imports and functions into analyzable code
  const codeSnippets = [
    ...imports.map((imp: string) => imp),
    '',
    ...functions
  ];
  
  return codeSnippets.join('\n');
}

/**
 * List of built-in globals that don't need to be declared
 */
const BUILT_IN_GLOBALS = new Set([
  // Browser/Node.js globals
  'console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
  'encodeURIComponent', 'decodeURIComponent', 'fetch', 'Promise', 'JSON',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Math', 'RegExp',
  'Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect',
  // Node.js globals
  'require', 'import', 'module', 'exports', 'process', 'Buffer', 'global',
  '__dirname', '__filename', 'setImmediate', 'clearImmediate',
  // Browser globals
  'window', 'document', 'navigator', 'location', 'history', 'localStorage',
  'sessionStorage', 'XMLHttpRequest', 'FormData', 'Blob', 'File',
  'alert', 'confirm', 'prompt', 'atob', 'btoa', 'URL', 'URLSearchParams',
  'addEventListener', 'removeEventListener',
  // React/JSX (if in React context)
  'React', 'ReactDOM'
]);

/**
 * Check for ACTUAL issues from static analysis first
 * ONLY flag CERTAIN failures - things that will 100% break at runtime
 */
function checkActualIssues(payload: any): { predicted_failure: number; failure_probability: number; reasoning: string; failure_points: string[] } | null {
  const issues = payload.actualIssues;
  if (!issues) return null;
  
  const certainFailures: string[] = [];
  
  // ONLY CERTAIN FAILURES - these will 100% crash
  // Filter out built-in globals
  if (issues.undefinedVariables?.length > 0) {
    const realUndefinedVars = issues.undefinedVariables.filter((v: any) => 
      !BUILT_IN_GLOBALS.has(v.name)
    );
    if (realUndefinedVars.length > 0) {
      certainFailures.push(...realUndefinedVars.map((v: any) => 
        `Undefined variable: ${v.name} at line ${v.line} - will throw ReferenceError`
      ));
    }
  }
  
  if (issues.undefinedFunctions?.length > 0) {
    // Filter out built-in functions like fetch, console, etc.
    const realUndefinedFuncs = issues.undefinedFunctions.filter((f: any) => 
      !BUILT_IN_GLOBALS.has(f.name)
    );
    if (realUndefinedFuncs.length > 0) {
      certainFailures.push(...realUndefinedFuncs.map((f: any) => 
        `Undefined function: ${f.name} at line ${f.line} - will throw ReferenceError`
      ));
    }
  }
  
  if (issues.syntaxErrors?.length > 0) {
    certainFailures.push(...issues.syntaxErrors.map((e: any) => 
      `Syntax error: ${e.message} at line ${e.line} - code won't parse`
    ));
  }
  
  if (issues.missingImports?.length > 0) {
    certainFailures.push(...issues.missingImports.map((i: any) => 
      `Missing import: ${i.identifier} from '${i.requiredFrom}' at line ${i.line} - will throw ReferenceError`
    ));
  }
  
  // If no certain failures, return null (let LLM analyze warnings)
  if (certainFailures.length === 0) return null;
  
  // These are CERTAIN failures - very high probability
  const probability = Math.min(0.95, 0.85 + (certainFailures.length * 0.05));
  
  return {
    predicted_failure: 1,
    failure_probability: probability,
    reasoning: `CERTAIN failure: ${certainFailures[0]}${certainFailures.length > 1 ? ` (+ ${certainFailures.length - 1} more)` : ''}`,
    failure_points: certainFailures
  };
}

/**
 * Prepare context for deep analysis
 */
function prepareAnalysisContext(payload: any): any {
  const context = payload.context || {};
  const extractedCode = extractCodeForAnalysis(payload);
  const repoContext = payload.repoContext || [];
  
  console.log("[failure-prediction] Analysis context prepared:");
  console.log(`   - Code length: ${extractedCode.length} chars`);
  console.log(`   - Repo context files: ${repoContext.length}`);
  console.log(`   - Available variables: ${context.availableInScope?.variables?.length || 0}`);
  console.log(`   - Available functions: ${context.availableInScope?.functions?.length || 0}`);
  console.log(`   - Code preview: ${extractedCode.substring(0, 200)}...`);
  
  // Format repo context for LLM prompt
  const formattedRepoContext = repoContext.map((file: any) => ({
    path: file.path,
    content: file.content?.substring(0, 2000) || '' // Limit each file to 2000 chars to avoid token limits
  }));
  
  return {
    fileId: payload.fileId,
    code: extractedCode,
    repoContext: formattedRepoContext,
    metrics: payload.metrics || {},
    patterns: payload.mernPatterns || {},
    // Include scope context
    availableInScope: context.availableInScope || {
      variables: [],
      functions: [],
      hooks: [],
      imports: []
    },
    propsAvailable: context.propsAvailable || {},
    externalDeps: context.externalDeps || { npm: [], internal: [] }
  };
}

export async function runLLMPredict(payload: any): Promise<any> {
  console.log("[failure-prediction] Starting LLM prediction...");
  
  // FIRST: Check for CERTAIN failures only (undefined vars, syntax errors, missing imports)
  const certainFailure = checkActualIssues(payload);
  if (certainFailure) {
    console.log("[failure-prediction] Found certain failure:", certainFailure);
    return certainFailure;
  }
  
  // Check if there are any warnings worth analyzing
  const issues = payload.actualIssues || {};
  const hasWarnings = (issues.unhandledPromises?.length || 0) > 0 || 
                      (issues.nullSafetyIssues?.length || 0) > 0;
  
  // If no LLM client and no warnings, predict PASS
  if (!client) {
    console.log("[failure-prediction] No LLM client, predicting PASS");
    return {
      predicted_failure: 0,
      failure_probability: 0.15,
      reasoning: "No critical issues found - code should execute",
      confidence: "medium"
    };
  }
  
  // If no warnings at all, predict PASS without LLM
  if (!hasWarnings) {
    console.log("[failure-prediction] No warnings found, predicting PASS");
    return {
      predicted_failure: 0,
      failure_probability: 0.1,
      reasoning: "Clean code - no issues detected",
      confidence: "high"
    };
  }
  
  const context = prepareAnalysisContext(payload);
  
  const repoContextSection = context.repoContext && context.repoContext.length > 0
    ? `
REPOSITORY CONTEXT (full codebase for reference):
${context.repoContext.map((file: any, idx: number) => `
File ${idx + 1}: ${file.path}
${file.content}
---`).join('\n')}

Use this repository context to:
- Understand how the changed code fits into the larger codebase
- Check for consistency with existing patterns
- Identify potential integration issues with other files
- Verify that imports and dependencies are correctly used across the codebase
`
    : '';

  const prompt = `You are an expert code reviewer analyzing a MERN stack code change for potential runtime failures.

FILE: ${context.fileId}

CODE TO ANALYZE (extracted from PR diff - final state after changes):
${context.code}
${repoContextSection}
AVAILABLE IN SCOPE (from full codebase analysis):
- Variables: ${JSON.stringify(context.availableInScope.variables)}
- Functions: ${JSON.stringify(context.availableInScope.functions)}
- Hooks: ${JSON.stringify(context.availableInScope.hooks)}
- Imports: ${JSON.stringify(context.availableInScope.imports)}

EXTERNAL DEPENDENCIES:
- NPM packages: ${JSON.stringify(context.externalDeps.npm)}

WARNINGS FOUND (NOT certain failures):
${JSON.stringify(issues, null, 2)}

CRITICAL INSTRUCTION:
Static analysis already checked for:
- Undefined variables/functions → NONE FOUND (would be certain failure)
- Syntax errors → NONE FOUND (would be certain failure)
- Missing imports for used APIs → NONE FOUND (would be certain failure)

The warnings above are POTENTIAL issues, not certain failures.

YOUR TASK - BE REALISTIC:
Analyze if the code will ACTUALLY FAIL AT RUNTIME based on what's written.

ONLY predict FAILURE (probability >= 0.5) if you see:

1. LOGIC ERRORS that will 100% crash:
   - Accessing property on value that's DEFINITELY null/undefined in the code path
   - Infinite loops that are OBVIOUS
   - Type mismatches that will throw errors (e.g., calling .map() on non-array)
   - Missing required parameters that will cause crashes

2. DO NOT predict failure for:
   - Unhandled promises (they don't crash unless rejected AND used)
   - Potential null access IF there are checks (if statements, optional chaining)
   - Missing error handling (bad practice but doesn't crash by default)
   - Code style issues
   - Best practice violations

EXAMPLES OF REAL FAILURES:
❌ "return user.name" where user is ALWAYS null → FAILURE (0.8)
❌ "items.map()" where items is a string → FAILURE (0.9)
❌ Infinite while loop → FAILURE (0.95)

EXAMPLES OF NON-FAILURES:
✅ "getUser().then()" without .catch() → PASS (promise might succeed)
✅ "user.name" where user comes from useState(null) but has loading check → PASS
✅ Missing try-catch around working code → PASS (just bad practice)
✅ Code without validation → PASS (might work with valid input)

ANALYZE THE ACTUAL CODE PATH:
- Does the code actually call the problematic line?
- Are there checks (if statements) protecting null access?
- Will the promise rejection actually affect runtime?
- Is there a real code path that leads to a crash?

RESPONSE FORMAT (JSON only):
{
  "predicted_failure": 0 or 1,
  "failure_probability": 0.0-1.0,
  "reasoning": "Specific issue with code path that WILL crash, or reason why it's safe",
  "confidence": "high/medium/low"
}

BE CONSERVATIVE - Default to PASS unless you're certain it will crash:
- If uncertain → predicted_failure = 0, probability <= 0.3
- Only predict failure if you can trace the exact crash path
- Warnings/best-practices violations → probability <= 0.3 (PASS)
- Actual logic errors visible in code → probability >= 0.7 (FAIL)

Now analyze:`;

  try {
    console.log("[failure-prediction] Calling Claude API...");
    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || !("text" in block)) {
      throw new Error("No text block from Claude");
    }

    let text = (block as any).text.trim()
      .replace(/```json\n?/g, "")
      .replace(/\n?```/g, "");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Raw response:", text);
      throw new Error("No JSON in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (typeof parsed.predicted_failure === "undefined" || 
        typeof parsed.failure_probability === "undefined") {
      throw new Error("Missing required fields");
    }

    console.log("[failure-prediction] LLM analysis result:", {
      predicted_failure: parsed.predicted_failure,
      probability: parsed.failure_probability,
      reasoning: parsed.reasoning?.substring(0, 150) + '...',
      confidence: parsed.confidence
    });
    
    return parsed;
    
  } catch (err: any) {
    console.error("[failure-prediction] Error:", err.message);
    return {
      predicted_failure: 0,
      failure_probability: 0.3,
      reasoning: "Analysis error - conservative default",
      confidence: "low"
    };
  }
}