import Anthropic from "@anthropic-ai/sdk";

function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    console.warn("[prediction] ANTHROPIC_API_KEY not set");
    return null;
  }
  try {
    return new Anthropic({ apiKey });
  } catch (err: any) {
    console.error("[prediction] Client init failed:", err?.message);
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
    if (/^@@/.test(line.trim())) {
      inHunk = true;
      continue;
    }
    
    if (/^[\+\-]{3}/.test(line.trim())) {
      continue;
    }
    
    const trimmed = line.trim();
    
    if (trimmed.startsWith('+') && !trimmed.startsWith('+++')) {
      const cleanedLine = line.substring(line.indexOf('+') + 1);
      cleanLines.push(cleanedLine);
    } else if (trimmed.startsWith('-') && !trimmed.startsWith('---')) {
      continue;
    } else if (inHunk && trimmed && !trimmed.startsWith('\\')) {
      cleanLines.push(line);
    }
  }
  
  return cleanLines.join('\n');
}

/**
 * Extract actual code content from payload for analysis
 */
function extractCodeForAnalysis(payload: any): string {
  if (payload.originalCode) {
    const code = payload.originalCode;
    const isDiff = code.includes('@@') || /^[\+\-]\s/m.test(code);
    
    if (isDiff) {
      console.log("[prediction] Detected diff format, extracting clean code...");
      return cleanDiffFormat(code);
    }
    
    return code;
  }
  
  const structure = payload.structure || {};
  const functions = structure.functions || [];
  const imports = structure.imports || [];
  
  return [
    ...imports,
    '',
    ...functions
  ].join('\n');
}

/**
 * List of built-in globals that don't need to be declared
 */
const BUILT_IN_GLOBALS = new Set([
  'console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
  'encodeURIComponent', 'decodeURIComponent', 'fetch', 'Promise', 'JSON',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Math', 'RegExp',
  'Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect',
  'require', 'import', 'module', 'exports', 'process', 'Buffer', 'global',
  '__dirname', '__filename', 'setImmediate', 'clearImmediate',
  'window', 'document', 'navigator', 'location', 'history', 'localStorage',
  'sessionStorage', 'XMLHttpRequest', 'FormData', 'Blob', 'File',
  'alert', 'confirm', 'prompt', 'atob', 'btoa', 'URL', 'URLSearchParams',
  'addEventListener', 'removeEventListener',
  'React', 'ReactDOM'
]);

/**
 * Check for ACTUAL issues from static analysis first
 */
function checkActualIssues(payload: any): { predicted_failure: number; failure_probability: number; reasoning: string; failure_points: string[] } | null {
  const issues = payload.actualIssues;
  if (!issues) return null;
  
  const certainFailures: string[] = [];
  
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
  
  if (certainFailures.length === 0) return null;
  
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
  
  const formattedRepoContext = repoContext.map((file: any) => ({
    path: file.path,
    content: file.content?.substring(0, 2000) || ''
  }));
  
  return {
    fileId: payload.fileId,
    code: extractedCode,
    repoContext: formattedRepoContext,
    metrics: payload.metrics || {},
    patterns: payload.mernPatterns || {},
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

export async function predictFailure(payload: any): Promise<any> {
  console.log("[prediction] Starting failure prediction...");
  
  const certainFailure = checkActualIssues(payload);
  if (certainFailure) {
    console.log("[prediction] Found certain failure:", certainFailure);
    return certainFailure;
  }
  
  const issues = payload.actualIssues || {};
  const hasWarnings = (issues.unhandledPromises?.length || 0) > 0 || 
                      (issues.nullSafetyIssues?.length || 0) > 0;
  
  if (!client) {
    console.log("[prediction] No LLM client, predicting PASS");
    return {
      predicted_failure: 0,
      failure_probability: 0.15,
      reasoning: "No critical issues found - code should execute",
      confidence: "medium"
    };
  }
  
  if (!hasWarnings) {
    console.log("[prediction] No warnings found, predicting PASS");
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
1. LOGIC ERRORS that will 100% crash
2. DO NOT predict failure for unhandled promises, potential null access with checks, missing error handling, code style issues

RESPONSE FORMAT (JSON only):
{
  "predicted_failure": 0 or 1,
  "failure_probability": 0.0-1.0,
  "reasoning": "Specific issue with code path that WILL crash, or reason why it's safe",
  "confidence": "high/medium/low"
}

BE CONSERVATIVE - Default to PASS unless you're certain it will crash.`;

  try {
    console.log("[prediction] Calling Claude API...");
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
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
      throw new Error("No JSON in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (typeof parsed.predicted_failure === "undefined" || 
        typeof parsed.failure_probability === "undefined") {
      throw new Error("Missing required fields");
    }
    
    return parsed;
    
  } catch (err: any) {
    console.error("[prediction] Error:", err.message);
    return {
      predicted_failure: 0,
      failure_probability: 0.3,
      reasoning: "Analysis error - conservative default",
      confidence: "low"
    };
  }
}

