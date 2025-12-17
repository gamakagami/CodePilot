import { llmClient } from "../utils/llmClient";
import { CodeAnalysisResult } from "./analysis.service";
import { codeTestService } from "./code-test.service";

export interface ReviewRequest {
  analysis: CodeAnalysisResult;
  prediction: {
    will_fail: boolean;
    failure_probability: number;
    confidence: string;
    reasoning?: string;
  };
  code?: string;
  repoContext?: Array<{ path: string; content: string }>;
  context?: {
    prNumber?: string;
    author?: string;
    branch?: string;
    title?: string;
    description?: string;
  };
}

export interface ReviewIssue {
  severity: "critical" | "high" | "medium" | "low";
  category: "error_handling" | "security" | "performance" | "maintainability" | "best_practices" | "mern_specific";
  title: string;
  description: string;
  suggestion: string;
  lineNumber?: number;
  codeSnippet?: string;
}

export interface ReviewResponse {
  summary: string;
  prComment: string; // GitHub-style PR comment
  riskLevel: "critical" | "high" | "medium" | "low";
  shouldMerge: boolean;
  shouldRequestChanges: boolean;
  issues: ReviewIssue[];
  recommendations: string[];
  codeQuality: {
    score: number;
    strengths: string[];
    weaknesses: string[];
  };
  mernSpecificFeedback: {
    backend?: string[];
    frontend?: string[];
    database?: string[];
    api?: string[];
  };
  generatedAt: string;
}

export const reviewService = {
  // Built-in globals that don't need declarations
  BUILT_IN_GLOBALS: new Set([
    // Node.js globals
    'require', 'module', 'exports', '__dirname', '__filename', 'process', 'console',
    'Buffer', 'global', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval',
    'setTimeout', 'clearTimeout', 'Promise', 'URL', 'URLSearchParams',
    
    // Browser globals
    'window', 'document', 'navigator', 'location', 'history', 'localStorage', 
    'sessionStorage', 'fetch', 'XMLHttpRequest', 'FormData', 'Blob', 'File',
    'alert', 'confirm', 'prompt', 'addEventListener', 'removeEventListener',
    
    // JavaScript built-ins
    'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON',
    'RegExp', 'Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'Map', 
    'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Proxy', 'Reflect', 'Intl',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
    'encodeURIComponent', 'decodeURIComponent', 'eval',
    
    // Common test framework globals
    'describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 
    'afterAll', 'jest', 'jasmine', 'mocha', 'chai',
    
    // React globals (often available without import in JSX)
    'React', 'ReactDOM',
    
    // Common environment variables
    'process', '__DEV__', 'NODE_ENV',
    
    // TypeScript
    'unknown', 'never', 'any', 'void', 'undefined', 'null'
  ]),

  // Common npm packages that might be used without explicit import in some setups
  COMMON_LIBRARIES: new Set([
    'express', 'mongoose', 'mongodb', 'axios', 'lodash', '_', 'moment',
    'bcrypt', 'jwt', 'jsonwebtoken', 'dotenv', 'cors', 'helmet',
    'validator', 'multer', 'sharp', 'joi', 'yup'
  ]),

  isBuiltInOrGlobal(variableName: string): boolean {
    return this.BUILT_IN_GLOBALS.has(variableName) || 
           this.COMMON_LIBRARIES.has(variableName);
  },

  // Check if a variable is a JSX prop or component prop
  isJSXPropOrAttribute(variableName: string, code?: string): boolean {
    // Common JSX props that don't need declaration
    const jsxProps = /^(className|style|key|ref|id|src|alt|href|target|rel|type|value|placeholder|disabled|checked|selected|required|readOnly|autoFocus|autoComplete|maxLength|minLength|max|min|step|pattern|title|aria-|data-|role|tabIndex)$/i;
    
    if (jsxProps.test(variableName)) {
      return true;
    }

    // Check if variable is used as a prop in JSX context
    if (code) {
      // Check if it's used in JSX attribute context: <Component prop={variable} />
      const jsxAttributePattern = new RegExp(`<\\w+[^>]*\\s+\\w+\\s*=\\s*{${variableName}}`, 'g');
      // Check if it's destructured from props: const { variable } = props or ({ variable })
      const propsDestructurePattern = new RegExp(`(?:const|let|var)?\\s*{[^}]*${variableName}[^}]*}\\s*=\\s*props|\\({[^}]*${variableName}[^}]*}\\)\\s*=>`, 'g');
      // Check if it's a component prop parameter
      const componentPropPattern = new RegExp(`function\\s+\\w+\\s*\\([^)]*{[^}]*${variableName}[^}]*}[^)]*\\)|\\([^)]*{[^}]*${variableName}[^}]*}[^)]*\\)\\s*=>`, 'g');
      
      if (jsxAttributePattern.test(code) || propsDestructurePattern.test(code) || componentPropPattern.test(code)) {
        return true;
      }

      // Check if variable is passed as children or prop value in JSX
      const jsxChildrenPattern = new RegExp(`<[^>]*>\\s*{${variableName}}\\s*</`, 'g');
      if (jsxChildrenPattern.test(code)) {
        return true;
      }
    }

    return false;
  },

  // Check if variable is declared anywhere in the code (including function params, destructuring, etc.)
  isVariableDeclaredInCode(variableName: string, code?: string): boolean {
    if (!code) return false;

    const patterns = [
      // Variable declarations
      new RegExp(`(?:const|let|var)\\s+${variableName}\\s*[=;]`, 'g'),
      // Function parameters
      new RegExp(`function\\s+\\w+\\s*\\([^)]*\\b${variableName}\\b[^)]*\\)`, 'g'),
      new RegExp(`\\([^)]*\\b${variableName}\\b[^)]*\\)\\s*=>`, 'g'),
      // Destructuring
      new RegExp(`{[^}]*\\b${variableName}\\b[^}]*}\\s*=`, 'g'),
      new RegExp(`\\[[^\\]]*\\b${variableName}\\b[^\\]]*\\]\\s*=`, 'g'),
      // Import statements
      new RegExp(`import\\s+(?:{[^}]*\\b${variableName}\\b[^}]*}|${variableName})\\s+from`, 'g'),
      new RegExp(`import\\s+\\*\\s+as\\s+${variableName}\\s+from`, 'g'),
      // For loop declarations
      new RegExp(`for\\s*\\([^)]*\\b${variableName}\\b[^)]*\\)`, 'g'),
      // Catch block parameters
      new RegExp(`catch\\s*\\(\\s*${variableName}\\s*\\)`, 'g'),
      // Class properties
      new RegExp(`class\\s+\\w+[^{]*{[^}]*\\b${variableName}\\b\\s*[=;]`, 'gs'),
    ];

    return patterns.some(pattern => pattern.test(code));
  },

  filterRealUndeclaredVariables(variables: any[], code?: string): any[] {
    return variables.filter(v => {
      const varName = v.name;
      
      // Filter out built-in globals
      if (this.isBuiltInOrGlobal(varName)) {
        return false;
      }

      // Filter out JSX props and attributes
      if (this.isJSXPropOrAttribute(varName, code)) {
        return false;
      }

      // Filter out variables that are actually declared in the code
      if (this.isVariableDeclaredInCode(varName, code)) {
        return false;
      }

      // Keep this as a real undeclared variable
      return true;
    });
  },

  async generateReview(request: ReviewRequest): Promise<ReviewResponse> {
    // Run code tests to find actual errors
    let testResults = null;
    if (request.code) {
      console.log('🧪 Running code tests...');
      try {
        testResults = await codeTestService.testCode(request.code, request.analysis.fileId);
        console.log(`✅ Test complete: ${testResults.errorCount} errors found`);
      } catch (error: any) {
        console.error('⚠️ Code testing failed:', error.message);
      }
    }

    const prompt = this.buildPrompt(request, testResults);
    
    try {
      const llmResponse = await llmClient(prompt);
      return this.parseResponse(llmResponse, request, testResults);
    } catch (error) {
      console.error("LLM call failed:", error);
      return this.createFallbackReview(request, testResults);
    }
  },

  buildPrompt(request: ReviewRequest, testResults?: any): string {
    const { analysis, prediction, context, repoContext } = request;
    
    const fileType = this.detectFileType(analysis.fileId);
    const metrics = analysis.metrics;
    
    // Clean the filename for display
    const displayFilename = analysis.fileId.replace(/^.*?localhost:\d+\//, '').replace(/^https?:\/\/[^\/]+\//, '');

    return `You are an expert MERN stack code reviewer providing feedback for a pull request.

## PR CONTEXT
File: ${displayFilename}
${context?.title ? `PR Title: ${context.title}` : ''}
${context?.author ? `Author: @${context.author}` : ''}
${context?.prNumber ? `PR #${context.prNumber}` : ''}

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

## ACTUAL TEST RESULTS
${testResults ? `
✓ Code was tested for runtime errors:
- Syntax Errors: ${testResults.syntaxError ? `❌ ${testResults.syntaxErrorMessage}` : '✓ None'}
- Undeclared Variables: ${testResults.undeclaredVariables.length > 0 ? `❌ ${testResults.undeclaredVariables.map((v: any) => v.name).join(', ')}` : '✓ None'}
- Missing Imports: ${testResults.missingImports.length > 0 ? `❌ ${testResults.missingImports.map((m: any) => m.name).join(', ')}` : '✓ None'}
- Runtime Errors: ${testResults.runtimeErrors.length > 0 ? `❌ ${testResults.runtimeErrors.length} found` : '✓ None'}
- Total Errors: ${testResults.errorCount}
` : 'Test results not available - relying on static analysis'}

## MERN PATTERNS DETECTED
Backend/API:
- Express Routes: ${analysis.mernPatterns.usesExpress ? '✓' : '✗'}
- Mongoose Models: ${analysis.mernPatterns.usesMongoose ? '✓' : '✗'}
- Async Functions: ${analysis.mernPatterns.asyncFunctionCount}
- Error Handling: ${analysis.mernPatterns.hasErrorHandling ? '✓' : '✗ MISSING'}
- Input Validation: ${analysis.mernPatterns.hasValidation ? '✓' : '✗ MISSING'}
- Unhandled Promises: ${analysis.mernPatterns.hasUnhandledPromises ? '⚠️ YES' : '✓ No'}

Architecture:
- Circular Dependencies: ${analysis.dependencies.hasCycles ? '⚠️ YES' : '✓ No'}
- Direct Dependencies: ${analysis.dependencies.direct?.length || analysis.dependencies.directDependencies?.length || 0}
- Reverse Dependencies: ${analysis.dependencies.reverse?.length || analysis.dependencies.reverseDependencies?.length || 0}

## REPOSITORY CONTEXT (Full Codebase)
${repoContext && repoContext.length > 0 ? `
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
` : 'No repository context provided'}

## SIMILAR CODE PATTERNS (Pinecone Vector Search)
${analysis.similarPatterns && analysis.similarPatterns.length > 0 ? `
Found ${analysis.similarPatterns.length} similar code patterns in the repository:
${analysis.similarPatterns.map((pattern: any, idx: number) => `
${idx + 1}. Pattern ID: ${pattern.id}
   - Similarity Score: ${pattern.similarityScore || pattern.score || 0}%
   ${pattern.metadata ? `- Metadata: ${JSON.stringify(pattern.metadata)}` : ''}
`).join('')}

Use these similar patterns to:
- Identify code duplication opportunities
- Suggest consistent patterns across the codebase
- Reference similar implementations for best practices
- Flag inconsistencies with established patterns
` : 'No similar patterns found in repository'}

## YOUR TASK
Generate a comprehensive code review focusing on:

1. **Critical Issues** (will break the code):
   - Syntax errors, undefined variables, missing imports
   - Unhandled promise rejections in async code
   - Database connection errors
   - Missing required middleware
   - Security vulnerabilities (SQL injection, XSS, etc.)

2. **MERN-Specific Best Practices**:
   - Express: Proper middleware ordering, error handling, route structure
   - MongoDB/Mongoose: Schema validation, connection pooling, query optimization
   - React (if frontend): Component structure, state management, hooks usage
   - Node.js: Async/await patterns, error propagation, environment variables

3. **Code Quality**:
   - Function complexity and readability
   - Error handling patterns
   - Input validation and sanitization
   - Code organization and maintainability
   - Code duplication (compare with similar patterns found)
   - Consistency with similar code patterns in the repository

4. **Security**:
   - Authentication/authorization issues
   - Data validation and sanitization
   - Sensitive data exposure
   - CORS and rate limiting

Return JSON with this structure:
{
  "summary": "Brief 2-3 sentence overview of the review",
  "prComment": "Detailed PR comment in markdown format with sections for critical issues, suggestions, and praise",
  "riskLevel": "critical|high|medium|low",
  "shouldMerge": boolean,
  "shouldRequestChanges": boolean,
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "error_handling|security|performance|maintainability|best_practices|mern_specific",
      "title": "Clear, actionable title",
      "description": "Detailed explanation of the issue and its impact",
      "suggestion": "Specific fix with code example if possible",
      "lineNumber": optional_line_number,
      "codeSnippet": "optional relevant code"
    }
  ],
  "recommendations": [
    "Prioritized list of actionable recommendations"
  ],
  "codeQuality": {
    "score": 0-100,
    "strengths": ["List actual strengths found in the code"],
    "weaknesses": ["List areas for improvement"]
  },
  "mernSpecificFeedback": {
    "backend": ["Express/Node.js specific feedback"],
    "frontend": ["React specific feedback if applicable"],
    "database": ["MongoDB/Mongoose specific feedback"],
    "api": ["API design and REST principles feedback"]
  }
}

GUIDELINES:
- Be constructive and specific, not vague
- Provide code examples in suggestions when possible
- Balance criticism with recognition of good practices
- Prioritize issues by severity and impact
- Focus on MERN stack best practices and conventions
- Make the PR comment friendly and encouraging
- If code is good, say so! Don't invent issues.
- Use similar code patterns to suggest consistency improvements or flag inconsistencies
- Reference similar patterns when suggesting best practices or identifying duplication

Return only valid JSON.`;
  },

  detectFileType(filename: string): string {
    // Clean up the filename - remove localhost paths and get just the filename
    const cleanFilename = filename.replace(/^.*?localhost:\d+\//, '').replace(/^https?:\/\/[^\/]+\//, '');
    
    const patterns = {
      'Express Route': /routes?\/|\.routes?\.|api\//i,
      'Mongoose Model': /models?\/|\.model\./i,
      'Express Middleware': /middleware\/|\.middleware\./i,
      'Controller': /controllers?\/|\.controller\./i,
      'Service': /services?\/|\.service\./i,
      'React Component': /components?\/|\.component\.|\.jsx$|\.tsx$|\.js$|\.ts$/i,
      'React Hook': /hooks?\/|use[A-Z].*\.(js|ts|jsx|tsx)$/,
      'Redux Store': /store\/|\.store\.|\.reducer\.|\.action\./i,
      'Utility': /utils?\/|helpers?\/|\.util\.|\.helper\./i,
      'Configuration': /config\/|\.config\./i,
      'Test File': /\.test\.|\.spec\.|__tests__/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleanFilename)) {
        return type;
      }
    }
    
    // Check file extension for MERN stack files
    if (/\.(jsx|tsx)$/.test(cleanFilename)) {
      return 'React Component (JSX/TSX)';
    }
    if (/\.(js|ts)$/.test(cleanFilename)) {
      return 'JavaScript/TypeScript File';
    }
    
    return 'MERN Stack File';
  },

  parseResponse(llmResponse: string, request: ReviewRequest, testResults?: any): ReviewResponse {
    try {
      const cleaned = llmResponse.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        ...parsed,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      return this.createFallbackReview(request, testResults);
    }
  },

  createFallbackReview(request: ReviewRequest, testResults?: any): ReviewResponse {
    const { analysis, prediction, context } = request;
    const issues: ReviewIssue[] = [];
    const mernFeedback: any = { backend: [], frontend: [], database: [], api: [] };

    // Critical: Syntax errors
    if (testResults?.syntaxError) {
      issues.push({
        severity: "critical",
        category: "error_handling",
        title: "Syntax Error - Code Will Not Execute",
        description: `Syntax error detected: ${testResults.syntaxErrorMessage}. The code cannot run with this error.`,
        suggestion: "Fix the syntax error. Check for missing brackets, semicolons, or typos in keywords.",
        codeSnippet: testResults.syntaxErrorMessage
      });
    }

    // Critical: Undeclared variables (filtered for built-ins)
    if (testResults?.undeclaredVariables?.length > 0) {
      const realUndeclared = this.filterRealUndeclaredVariables(testResults.undeclaredVariables, request.code);
      realUndeclared.forEach((v: any) => {
        issues.push({
          severity: "critical",
          category: "error_handling",
          title: `Undeclared Variable: ${v.name}`,
          description: `Variable "${v.name}" is used without being declared. This will throw a ReferenceError at runtime.`,
          suggestion: `Add declaration: \`const ${v.name} = ...\` or import it from the appropriate module.`,
          lineNumber: v.line
        });
      });
    }

    // Critical: Missing imports
    if (testResults?.missingImports?.length > 0) {
      testResults.missingImports.forEach((m: any) => {
        issues.push({
          severity: "critical",
          category: "error_handling",
          title: `Missing Import: ${m.name}`,
          description: `"${m.name}" is used ${m.usedAt} but not imported. This will cause a ReferenceError.`,
          suggestion: `Add import statement: \`import ${m.name} from '...';\` or \`const ${m.name} = require('...');\``,
        });
      });
    }

    // Critical: Unhandled promise rejections
    if (analysis.mernPatterns.hasUnhandledPromises) {
      issues.push({
        severity: "critical",
        category: "error_handling",
        title: "Unhandled Promise Rejections",
        description: `Found ${analysis.mernPatterns.asyncFunctionCount} async functions with unhandled promise rejections. These can crash the Node.js process.`,
        suggestion: `Wrap async operations in try-catch blocks:\n\`\`\`javascript\ntry {\n  const result = await asyncOperation();\n} catch (error) {\n  console.error('Error:', error);\n  res.status(500).json({ error: 'Internal server error' });\n}\n\`\`\``,
      });
      mernFeedback.backend.push("Add proper error handling to all async/await operations");
    }

    // High: Missing error handling in Express routes
    if (analysis.mernPatterns.usesExpress && !analysis.mernPatterns.hasErrorHandling) {
      issues.push({
        severity: "high",
        category: "mern_specific",
        title: "Missing Error Handling in Express Routes",
        description: "Express routes should have proper error handling to prevent application crashes and provide meaningful error responses.",
        suggestion: `Add error handling middleware:\n\`\`\`javascript\napp.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).json({ error: 'Something went wrong!' });\n});\n\`\`\``
      });
      mernFeedback.backend.push("Implement centralized error handling middleware");
      mernFeedback.api.push("Add consistent error response format across all endpoints");
    }

    // High: Missing input validation
    if ((analysis.mernPatterns.usesExpress || analysis.mernPatterns.usesMongoose) && !analysis.mernPatterns.hasValidation) {
      issues.push({
        severity: "high",
        category: "security",
        title: "Missing Input Validation",
        description: "API endpoints should validate input data to prevent injection attacks and data integrity issues.",
        suggestion: `Use validation libraries like Joi or express-validator:\n\`\`\`javascript\nconst { body, validationResult } = require('express-validator');\n\nrouter.post('/users',\n  body('email').isEmail(),\n  body('password').isLength({ min: 8 }),\n  (req, res) => {\n    const errors = validationResult(req);\n    if (!errors.isEmpty()) {\n      return res.status(400).json({ errors: errors.array() });\n    }\n    // Process valid data\n  }\n);\n\`\`\``
      });
      mernFeedback.backend.push("Add input validation to protect against malformed requests");
      mernFeedback.api.push("Validate all request parameters, body, and query strings");
    }

    // Medium: High complexity
    if (analysis.metrics.cyclomaticComplexity > 15) {
      issues.push({
        severity: "medium",
        category: "maintainability",
        title: `High Cyclomatic Complexity (${analysis.metrics.cyclomaticComplexity})`,
        description: "High complexity makes code harder to test and maintain. Consider breaking down complex functions.",
        suggestion: "Refactor complex functions into smaller, single-purpose functions. Aim for complexity < 10 per function."
      });
    }

    // Medium: Mongoose-specific issues
    if (analysis.mernPatterns.usesMongoose) {
      mernFeedback.database.push("Ensure Mongoose schemas have proper validation rules");
      mernFeedback.database.push("Use indexes on frequently queried fields for better performance");
      mernFeedback.database.push("Handle MongoDB connection errors gracefully");
    }

    // Calculate risk level and scores
    const riskLevel = this.calculateRiskLevel(prediction.failure_probability, issues);
    const score = this.calculateScore(analysis, issues);
    const shouldRequestChanges = issues.some(i => i.severity === "critical" || i.severity === "high");

    // Build PR comment
    const prComment = this.buildPRComment(analysis, issues, score, prediction, context);

    // Build recommendations
    const recommendations = this.buildRecommendations(issues, analysis, testResults);

    const summary = this.buildSummary(analysis, issues, prediction, testResults);

    return {
      summary,
      prComment,
      riskLevel,
      shouldMerge: !shouldRequestChanges && riskLevel !== "critical",
      shouldRequestChanges,
      issues,
      recommendations,
      codeQuality: {
        score,
        strengths: this.identifyStrengths(analysis),
        weaknesses: issues.filter(i => i.severity === "high" || i.severity === "critical").map(i => i.title)
      },
      mernSpecificFeedback: mernFeedback,
      generatedAt: new Date().toISOString()
    };
  },

  buildPRComment(
    analysis: CodeAnalysisResult,
    issues: ReviewIssue[],
    score: number,
    prediction: any,
    context?: any
  ): string {
    // Clean the filename for display
    const displayFilename = analysis.fileId.replace(/^.*?localhost:\d+\//, '').replace(/^https?:\/\/[^\/]+\//, '');
    
    const critical = issues.filter(i => i.severity === "critical");
    const high = issues.filter(i => i.severity === "high");
    const medium = issues.filter(i => i.severity === "medium");
    const low = issues.filter(i => i.severity === "low");

    let comment = `## 🔍 Code Review for \`${displayFilename}\`\n\n`;
    
    // Status indicator
    if (critical.length > 0) {
      comment += `### ❌ Changes Requested\n\n`;
    } else if (high.length > 0) {
      comment += `### ⚠️ Review Required\n\n`;
    } else {
      comment += `### ✅ Looks Good!\n\n`;
    }

    // Quality score
    const scoreEmoji = score >= 80 ? "🟢" : score >= 60 ? "🟡" : "🔴";
    comment += `**Code Quality Score:** ${scoreEmoji} ${score}/100\n\n`;

    // ML Prediction
    comment += `**AI Analysis:** ${prediction.will_fail ? '⚠️ Potential Issues Detected' : '✓ No Major Issues'} (${(prediction.failure_probability * 100).toFixed(0)}% risk)\n\n`;

    // Critical issues section
    if (critical.length > 0) {
      comment += `### 🚨 Critical Issues (Must Fix)\n\n`;
      critical.forEach((issue, i) => {
        comment += `${i + 1}. **${issue.title}**\n`;
        comment += `   - ${issue.description}\n`;
        comment += `   - 💡 **Fix:** ${issue.suggestion}\n\n`;
      });
    }

    // High priority issues
    if (high.length > 0) {
      comment += `### ⚠️ High Priority\n\n`;
      high.forEach((issue, i) => {
        comment += `${i + 1}. **${issue.title}**\n`;
        comment += `   - ${issue.description}\n`;
        comment += `   - 💡 **Suggestion:** ${issue.suggestion}\n\n`;
      });
    }

    // Medium/Low issues
    if (medium.length > 0 || low.length > 0) {
      comment += `### 📝 Suggestions for Improvement\n\n`;
      [...medium, ...low].forEach((issue, i) => {
        comment += `${i + 1}. **${issue.title}** (${issue.severity})\n`;
        comment += `   - ${issue.description}\n\n`;
      });
    }

    // Strengths section
    const strengths = this.identifyStrengths(analysis);
    if (strengths.length > 0) {
      comment += `### 💪 What's Working Well\n\n`;
      strengths.forEach(strength => {
        comment += `- ✓ ${strength}\n`;
      });
      comment += `\n`;
    }

    // Footer
    if (critical.length === 0 && high.length === 0) {
      comment += `---\n\n*Nice work! The code looks solid. Feel free to merge when ready.* 🚀\n`;
    } else {
      comment += `---\n\n*Please address the issues above before merging. Happy to review again!* 👍\n`;
    }

    return comment;
  },

  buildSummary(
    analysis: CodeAnalysisResult,
    issues: ReviewIssue[],
    prediction: any,
    testResults?: any
  ): string {
    // Clean the filename for display
    const displayFilename = analysis.fileId.replace(/^.*?localhost:\d+\//, '').replace(/^https?:\/\/[^\/]+\//, '');
    
    const critical = issues.filter(i => i.severity === "critical").length;
    const high = issues.filter(i => i.severity === "high").length;
    const errorCount = testResults?.errorCount || 0;

    if (critical > 0) {
      return `${displayFilename}: Found ${critical} critical error(s) that will prevent the code from running. ${errorCount > 0 ? `${errorCount} runtime errors detected in testing.` : ''} Please fix before merging.`;
    } else if (high > 0) {
      return `${displayFilename}: Found ${high} high-priority issue(s) that should be addressed. Code may work but has potential problems. Review recommended before merging.`;
    } else if (issues.length > 0) {
      return `${displayFilename}: Found ${issues.length} minor issue(s). Code is functional but could be improved. Consider addressing suggestions for better code quality.`;
    } else {
      return `${displayFilename}: Code looks good! No critical issues detected. ${prediction.will_fail ? 'ML detected potential edge cases, but static analysis found no problems.' : 'All checks passed.'} Ready to merge.`;
    }
  },

  calculateRiskLevel(
    failureProbability: number,
    issues: ReviewIssue[]
  ): "critical" | "high" | "medium" | "low" {
    const hasCritical = issues.some(i => i.severity === "critical");
    const hasHigh = issues.some(i => i.severity === "high");
    const criticalCount = issues.filter(i => i.severity === "critical").length;
    const highCount = issues.filter(i => i.severity === "high").length;

    if (hasCritical && criticalCount > 2) return "critical";
    if (failureProbability > 0.8 || hasCritical) return "critical";
    if (failureProbability > 0.6 || hasHigh) return "high";
    if (failureProbability > 0.4 || issues.length > 3) return "medium";
    return "low";
  },

  calculateScore(analysis: CodeAnalysisResult, issues: ReviewIssue[]): number {
    let score = 100;
    
    // Deduct for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case "critical": score -= 25; break;
        case "high": score -= 15; break;
        case "medium": score -= 8; break;
        case "low": score -= 3; break;
      }
    });

    // Bonus for good practices
    if (analysis.mernPatterns.hasErrorHandling) score += 10;
    if (analysis.mernPatterns.hasValidation) score += 10;
    if (analysis.metrics.cyclomaticComplexity < 10) score += 5;
    if (!analysis.dependencies.hasCycles) score += 5;
    if (analysis.mernPatterns.asyncFunctionCount > 0 && !analysis.mernPatterns.hasUnhandledPromises) {
      score += 10; // Bonus for proper async handling
    }

    return Math.max(0, Math.min(100, score));
  },

  buildRecommendations(
    issues: ReviewIssue[],
    analysis: CodeAnalysisResult,
    testResults?: any
  ): string[] {
    const recs: string[] = [];
    
    const critical = issues.filter(i => i.severity === "critical");
    const high = issues.filter(i => i.severity === "high");
    const hasSecurityIssues = issues.some(i => i.category === "security");
    const hasMernIssues = issues.some(i => i.category === "mern_specific");

    // Prioritized recommendations
    if (critical.length > 0) {
      recs.push(`🚨 URGENT: Fix ${critical.length} critical error(s) - code will fail without these fixes`);
    }

    if (high.length > 0) {
      recs.push(`⚠️ HIGH PRIORITY: Address ${high.length} high-priority issue(s) before merging`);
    }

    if (hasSecurityIssues) {
      recs.push(`🔒 SECURITY: Review and fix security vulnerabilities`);
    }

    if (analysis.mernPatterns.hasUnhandledPromises) {
      recs.push(`Add try-catch blocks to all async/await operations to prevent crashes`);
    }

    if (analysis.mernPatterns.usesExpress && !analysis.mernPatterns.hasErrorHandling) {
      recs.push(`Implement centralized error handling middleware for Express routes`);
    }

    if (!analysis.mernPatterns.hasValidation) {
      recs.push(`Add input validation using express-validator or Joi to protect API endpoints`);
    }

    if (analysis.metrics.cyclomaticComplexity > 15) {
      recs.push(`Refactor complex functions (complexity: ${analysis.metrics.cyclomaticComplexity}) into smaller, testable units`);
    }

    if (hasMernIssues) {
      recs.push(`Review MERN stack best practices and apply recommended patterns`);
    }

    // If no issues, provide general best practices
    if (recs.length === 0) {
      recs.push(`✅ Code is in good shape! Consider adding unit tests to maintain quality`);
      if (analysis.mernPatterns.usesMongoose) {
        recs.push(`Consider adding indexes to Mongoose schemas for frequently queried fields`);
      }
      if (analysis.mernPatterns.usesExpress) {
        recs.push(`Consider adding rate limiting and request validation middleware`);
      }
    }

    return recs;
  },

  identifyStrengths(analysis: CodeAnalysisResult): string[] {
    const strengths: string[] = [];
    
    if (analysis.mernPatterns.hasErrorHandling) {
      strengths.push("Implements proper error handling");
    }
    
    if (analysis.mernPatterns.hasValidation) {
      strengths.push("Uses input validation");
    }
    
    if (analysis.metrics.cyclomaticComplexity < 10) {
      strengths.push(`Low complexity (${analysis.metrics.cyclomaticComplexity}) - easy to understand and maintain`);
    }
    
    if (!analysis.dependencies.hasCycles) {
      strengths.push("Clean dependency structure with no circular references");
    }
    
    if (analysis.mernPatterns.asyncFunctionCount > 0 && !analysis.mernPatterns.hasUnhandledPromises) {
      strengths.push("Proper async/await error handling");
    }
    
    if (analysis.mernPatterns.usesExpress) {
      strengths.push("Following Express.js conventions");
    }
    
    if (analysis.mernPatterns.usesMongoose) {
      strengths.push("Using Mongoose for database operations");
    }
    
    if (analysis.metrics.avgFunctionLength && analysis.metrics.avgFunctionLength < 30) {
      strengths.push("Functions are concise and focused");
    }
    
    if (strengths.length === 0) {
      strengths.push("Code follows basic JavaScript conventions");
    }

    return strengths;
  }
};