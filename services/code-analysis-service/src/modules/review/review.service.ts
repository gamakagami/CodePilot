import Anthropic from "@anthropic-ai/sdk";


function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    console.warn("[review] ANTHROPIC_API_KEY not set");
    return null;
  }
  try {
    return new Anthropic({ apiKey });
  } catch (err: any) {
    console.error("[review] Client init failed:", err?.message);
    return null;
  }
}

const client = createAnthropicClient();

export interface ReviewRequest {
  analysis: any;
  prediction: {
    will_fail: boolean;
    failure_probability: number;
    confidence: string;
    reasoning?: string;
  };
  code?: string;
  repoContext?: Array<{ path: string; content: string }>;
}

export interface ReviewResponse {
  summary: string;
  prComment: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  shouldMerge: boolean;
  shouldRequestChanges: boolean;
  issues: any[];
  recommendations: string[];
  codeQuality: {
    score: number;
    strengths: string[];
    weaknesses: string[];
    improvementAreas?: string[];
  };
  mernSpecificFeedback: {
    backend?: string[];
    frontend?: string[];
    database?: string[];
    api?: string[];
  };
  generatedAt: string;
}

function detectFileType(filename: string): string {
  const cleanFilename = filename.replace(/^.*?localhost:\d+\//, '').replace(/^https?:\/\/[^\/]+\//, '');
  
  const patterns = {
    'Express Route': /routes?\/|\.routes?\.|api\//i,
    'Mongoose Model': /models?\/|\.model\./i,
    'Express Middleware': /middleware\/|\.middleware\./i,
    'Controller': /controllers?\/|\.controller\./i,
    'Service': /services?\/|\.service\./i,
    'React Component': /components?\/|\.component\.|\.jsx$|\.tsx$|\.js$|\.ts$/i,
    'React Hook': /hooks?\/|use[A-Z].*\.(js|ts|jsx|tsx)$/,
    'Utility': /utils?\/|helpers?\/|\.util\.|\.helper\./i,
    'Configuration': /config\/|\.config\./i,
    'Test File': /\.test\.|\.spec\.|__tests__/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleanFilename)) {
      return type;
    }
  }
  
  if (/\.(jsx|tsx)$/.test(cleanFilename)) {
    return 'React Component (JSX/TSX)';
  }
  if (/\.(js|ts)$/.test(cleanFilename)) {
    return 'JavaScript/TypeScript File';
  }
  
  return 'MERN Stack File';
}

function buildPrompt(request: ReviewRequest): string {
  const { analysis, prediction, repoContext } = request;
  const fileType = detectFileType(analysis.fileId);
  const metrics = analysis.metrics;
  const displayFilename = analysis.fileId.replace(/^.*?localhost:\d+\//, '').replace(/^https?:\/\/[^\/]+\//, '');

  const repoContextSection = repoContext && repoContext.length > 0
    ? `
## REPOSITORY CONTEXT (Full Codebase)
The following ${repoContext.length} file(s) from the repository are provided for context:
${repoContext.slice(0, 20).map((file: any, idx: number) => {
  const content = file.content || '';
  const truncated = content.length > 2000 ? content.substring(0, 2000) + '\n... (truncated for length)' : content;
  return `
### File ${idx + 1}: ${file.path}
\`\`\`
${truncated}
\`\`\`
`;
}).join('\n')}${repoContext.length > 20 ? `\n\n... and ${repoContext.length - 20} more files (omitted for brevity)` : ''}

Use this repository context to:
- Understand how the changed code integrates with the existing codebase
- Check for consistency with established patterns and conventions
- Identify potential integration issues or conflicts
- Suggest improvements based on how similar code is structured elsewhere
- Flag inconsistencies with the rest of the codebase
- Reference actual implementations when providing code examples
`
    : '';

  return `You are an expert MERN stack code reviewer providing feedback for a pull request.

## PR CONTEXT
File: ${displayFilename}

## FILE TYPE & STACK
${fileType}

## CODE METRICS
- Lines: ${metrics.totalLines}
- Functions: ${metrics.functionCount}
- Complexity: ${metrics.cyclomaticComplexity}
- Avg Function Length: ${metrics.avgFunctionLength?.toFixed(1)} lines

## ML PREDICTION
Status: ${prediction.will_fail ? '⚠️ LIKELY TO FAIL' : '✅ Likely to Pass'}
Failure Probability: ${(prediction.failure_probability * 100).toFixed(0)}%
Confidence: ${prediction.confidence}
${prediction.reasoning ? `Analysis: ${prediction.reasoning}` : ''}

## ACTUAL ISSUES DETECTED
${analysis.actualIssues ? `
- Undefined Variables: ${analysis.actualIssues.undefinedVariables?.length || 0}
- Undefined Functions: ${analysis.actualIssues.undefinedFunctions?.length || 0}
- Missing Imports: ${analysis.actualIssues.missingImports?.length || 0}
- Syntax Errors: ${analysis.actualIssues.syntaxErrors?.length || 0}
- Null Safety Issues: ${analysis.actualIssues.nullSafetyIssues?.length || 0}
- Unhandled Promises: ${analysis.actualIssues.unhandledPromises?.length || 0}
` : 'No critical issues detected'}

## MERN PATTERNS DETECTED
Backend/API:
- Express Routes: ${analysis.mernPatterns?.usesExpress || analysis.mernPatterns?.express?.usesExpress || analysis.mernPatterns?.errorHandling?.usesExpress ? '✓' : '✗'}
- Mongoose Models: ${analysis.mernPatterns?.usesMongoose || analysis.mernPatterns?.database?.usesMongoose ? '✓' : '✗'}
- Async Functions: ${analysis.mernPatterns?.asyncFunctionCount || analysis.mernPatterns?.errorHandling?.asyncFunctionCount || 0}
- Error Handling: ${analysis.mernPatterns?.hasErrorHandling || analysis.mernPatterns?.errorHandling?.hasErrorHandling ? '✓' : '✗ MISSING'}
- Input Validation: ${analysis.mernPatterns?.hasValidation || analysis.mernPatterns?.validation?.hasValidation ? '✓' : '✗ MISSING'}
- Unhandled Promises: ${analysis.mernPatterns?.hasUnhandledPromises || analysis.mernPatterns?.errorHandling?.hasUnhandledPromises ? '⚠️ YES' : '✓ No'}

Architecture:
- Circular Dependencies: ${analysis.dependencies?.hasCycles ? '⚠️ YES' : '✓ No'}
- Direct Dependencies: ${Array.isArray(analysis.dependencies?.direct) ? analysis.dependencies.direct.length : (Array.isArray(analysis.dependencies?.directDependencies) ? analysis.dependencies.directDependencies.length : 0)}
- Reverse Dependencies: ${Array.isArray(analysis.dependencies?.reverse) ? analysis.dependencies.reverse.length : (Array.isArray(analysis.dependencies?.reverseDependencies) ? analysis.dependencies.reverseDependencies.length : 0)}
${repoContextSection}
## SIMILAR CODE PATTERNS
${analysis.similarPatterns && analysis.similarPatterns.length > 0 ? `
Found ${analysis.similarPatterns.length} similar code patterns in the repository:
${analysis.similarPatterns.map((pattern: any, idx: number) => `
${idx + 1}. Pattern ID: ${pattern.id}
   - Similarity Score: ${pattern.similarityScore || pattern.score || 0}%
   ${pattern.metadata ? `- Metadata: ${JSON.stringify(pattern.metadata)}` : ''}
`).join('')}
` : 'No similar patterns found in repository'}

## YOUR TASK
Generate a comprehensive code review focusing on:
1. **Critical Issues** (will break the code)
2. **MERN-Specific Best Practices**
3. **Code Quality** and maintainability
4. **Security** concerns

Return JSON with this structure:
{
  "summary": "Brief 2-3 sentence overview",
  "prComment": "Detailed PR comment in markdown",
  "riskLevel": "critical|high|medium|low",
  "shouldMerge": boolean,
  "shouldRequestChanges": boolean,
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "error_handling|security|performance|maintainability|best_practices|mern_specific",
      "title": "Clear title",
      "description": "Detailed explanation",
      "suggestion": "Specific fix",
      "lineNumber": optional,
      "codeSnippet": "optional"
    }
  ],
  "recommendations": ["Prioritized recommendations"],
  "codeQuality": {
    "score": 0-100,
    "strengths": ["List strengths"],
    "weaknesses": ["List weaknesses"]
  },
  "mernSpecificFeedback": {
    "backend": ["Express/Node.js feedback"],
    "frontend": ["React feedback if applicable"],
    "database": ["MongoDB/Mongoose feedback"],
    "api": ["API design feedback"]
  }
}

Return only valid JSON.`;
}

function createFallbackReview(request: ReviewRequest): ReviewResponse {
  const { analysis, prediction } = request;
  const issues: any[] = [];
  
  // Add issues from actualIssues
  if (analysis.actualIssues?.undefinedFunctions?.length > 0) {
    analysis.actualIssues.undefinedFunctions.forEach((f: any) => {
      issues.push({
        severity: "critical",
        category: "error_handling",
        title: `Undefined Function: ${f.name}`,
        description: `Function "${f.name}" is used but not defined.`,
        suggestion: `Define the function or import it.`,
        lineNumber: f.line
      });
    });
  }

  if (analysis.actualIssues?.undefinedVariables?.length > 0) {
    analysis.actualIssues.undefinedVariables.forEach((v: any) => {
      issues.push({
        severity: "critical",
        category: "error_handling",
        title: `Undefined Variable: ${v.name}`,
        description: `Variable "${v.name}" is used but not defined.`,
        suggestion: `Declare the variable or import it.`,
        lineNumber: v.line
      });
    });
  }

  if (analysis.actualIssues?.missingImports?.length > 0) {
    analysis.actualIssues.missingImports.forEach((m: any) => {
      issues.push({
        severity: "critical",
        category: "error_handling",
        title: `Missing Import: ${m.identifier || m.name}`,
        description: `"${m.identifier || m.name}" is used but not imported.`,
        suggestion: `Add import statement: import ${m.identifier || m.name} from '${m.requiredFrom || '...'}';`,
        lineNumber: m.line
      });
    });
  }

  const riskLevel = prediction.failure_probability > 0.7 ? "critical" : 
                   prediction.failure_probability > 0.5 ? "high" :
                   prediction.failure_probability > 0.3 ? "medium" : "low";

  const criticalIssuesCount = issues.filter((i: any) => i.severity === "critical" || i.severity === "high").length;

  return {
    summary: `Code review for ${analysis.fileId}. ${prediction.will_fail ? 'Potential issues detected.' : 'Code looks good.'}`,
    prComment: `## Code Review\n\n${prediction.will_fail ? '⚠️ Potential issues detected' : '✅ Code looks good'}`,
    riskLevel,
    shouldMerge: !prediction.will_fail && criticalIssuesCount === 0,
    shouldRequestChanges: prediction.will_fail || criticalIssuesCount > 0,
    issues,
    recommendations: issues.length > 0 ? ["Fix critical issues before merging"] : ["Code is ready for review"],
    codeQuality: {
      score: prediction.will_fail ? 50 : 80,
      strengths: [],
      weaknesses: issues.map((i: any) => i.title),
      improvementAreas: issues.map((i: any) => i.title) // Required by orchestrator
    },
    mernSpecificFeedback: {
      backend: [],
      frontend: [],
      database: [],
      api: []
    },
    generatedAt: new Date().toISOString()
  };
}

export async function generateReview(request: ReviewRequest): Promise<ReviewResponse> {
  console.log("[review] Starting review generation...");
  
  if (!client) {
    console.warn("[review] No LLM client, using fallback review");
    return createFallbackReview(request);
  }

  const prompt = buildPrompt(request);
  
  try {
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
      throw new Error("No JSON in response");
    }

    // Clean control characters that break JSON parsing
    let cleanedJson = jsonMatch[0];
    
    // First, try to parse as-is
    let parsed;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch (parseError: any) {
      // If parsing fails, clean control characters
      console.warn("[review] First parse attempt failed, cleaning control characters...");
      try {
        // Remove problematic control characters
        // Keep \n, \r, \t when they're escaped, but remove unescaped control chars
        cleanedJson = cleanedJson
          // Remove null bytes and other problematic control chars
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
          .replace(/\u0000/g, '')
          // Replace unescaped newlines/tabs/carriage returns within string values with spaces
          // This is a simple approach - replace control chars that aren't part of escaped sequences
          .replace(/([^\\])\n/g, '$1 ') // Replace unescaped newlines
          .replace(/([^\\])\r/g, '$1') // Remove unescaped carriage returns
          .replace(/([^\\])\t/g, '$1 '); // Replace unescaped tabs
        
        parsed = JSON.parse(cleanedJson);
      } catch (secondError: any) {
        // Last resort: aggressive cleanup
        console.warn("[review] Second parse attempt failed, trying aggressive cleanup...");
        try {
          // Remove all control characters, keep only printable ASCII and escaped sequences
          cleanedJson = cleanedJson
            .replace(/[^\x20-\x7E\\"]/g, ' ') // Keep printable ASCII, backslashes, and quotes
            .replace(/\s+/g, ' '); // Normalize whitespace
          
          parsed = JSON.parse(cleanedJson);
        } catch (thirdError: any) {
          console.error("[review] JSON parsing failed after all cleanup attempts:", thirdError.message);
          console.error("[review] Problematic JSON (first 500 chars):", cleanedJson.substring(0, 500));
          throw new Error(`JSON parse error: ${thirdError.message}`);
        }
      }
    }
    
    // Ensure all required fields exist with proper structure
    const reviewResponse: ReviewResponse = {
      summary: parsed.summary || createFallbackReview(request).summary,
      prComment: parsed.prComment || parsed.summary || "",
      riskLevel: parsed.riskLevel || "medium",
      shouldMerge: parsed.shouldMerge ?? false,
      shouldRequestChanges: parsed.shouldRequestChanges ?? true,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      codeQuality: {
        score: parsed.codeQuality?.score ?? 50,
        strengths: Array.isArray(parsed.codeQuality?.strengths) ? parsed.codeQuality.strengths : [],
        weaknesses: Array.isArray(parsed.codeQuality?.weaknesses) ? parsed.codeQuality.weaknesses : [],
        improvementAreas: Array.isArray(parsed.codeQuality?.weaknesses) ? parsed.codeQuality.weaknesses : 
                          Array.isArray(parsed.codeQuality?.improvementAreas) ? parsed.codeQuality.improvementAreas : []
      },
      mernSpecificFeedback: {
        backend: Array.isArray(parsed.mernSpecificFeedback?.backend) ? parsed.mernSpecificFeedback.backend : [],
        frontend: Array.isArray(parsed.mernSpecificFeedback?.frontend) ? parsed.mernSpecificFeedback.frontend : [],
        database: Array.isArray(parsed.mernSpecificFeedback?.database) ? parsed.mernSpecificFeedback.database : [],
        api: Array.isArray(parsed.mernSpecificFeedback?.api) ? parsed.mernSpecificFeedback.api : []
      },
      generatedAt: new Date().toISOString()
    };
    
    return reviewResponse;
    
  } catch (err: any) {
    console.error("[review] LLM call failed:", err.message);
    if (err.stack) {
      console.error("[review] Stack:", err.stack);
    }
    return createFallbackReview(request);
  }
}

