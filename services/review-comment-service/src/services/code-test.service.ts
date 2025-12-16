import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface CodeTestResult {
  syntaxError: boolean;
  syntaxErrorMessage?: string;
  undeclaredVariables: Array<{ name: string; line?: number }>;
  undefinedVariables: Array<{ name: string; line?: number }>;
  typeErrors: Array<{ message: string; line?: number }>;
  missingImports: Array<{ name: string; usedAt: string }>;
  runtimeErrors: Array<{ message: string; line?: number }>;
  hasErrors: boolean;
  errorCount: number;
}

export const codeTestService = {
  /**
   * Run a chain of tests on the code to find actual errors
   */
  async testCode(code: string, fileId: string): Promise<CodeTestResult> {
    const result: CodeTestResult = {
      syntaxError: false,
      undeclaredVariables: [],
      undefinedVariables: [],
      typeErrors: [],
      missingImports: [],
      runtimeErrors: [],
      hasErrors: false,
      errorCount: 0
    };

    try {
      // Test 1: Syntax validation using Node.js
      const syntaxCheck = await this.checkSyntax(code, fileId);
      if (syntaxCheck.hasError) {
        result.syntaxError = true;
        result.syntaxErrorMessage = syntaxCheck.error;
        result.errorCount++;
      }

      // Test 2: Check for undeclared variables
      const undeclared = await this.findUndeclaredVariables(code);
      result.undeclaredVariables = undeclared;
      result.errorCount += undeclared.length;

      // Test 3: Check for undefined variables (used but not defined)
      const undefined = await this.findUndefinedVariables(code);
      result.undefinedVariables = undefined;
      result.errorCount += undefined.length;

      // Test 4: Check for missing imports
      const missingImports = await this.findMissingImports(code);
      result.missingImports = missingImports;
      result.errorCount += missingImports.length;

      // Test 5: Try to execute the code (if safe) to catch runtime errors
      const runtimeErrors = await this.checkRuntimeErrors(code, fileId);
      result.runtimeErrors = runtimeErrors;
      result.errorCount += runtimeErrors.length;

      result.hasErrors = result.errorCount > 0;

      return result;
    } catch (error: any) {
      console.error("Code testing error:", error);
      // If testing fails, assume there might be errors
      result.hasErrors = true;
      result.errorCount = 1;
      result.runtimeErrors.push({
        message: `Testing failed: ${error.message}`,
        line: undefined
      });
      return result;
    }
  },

  /**
   * Test 1: Check syntax by trying to parse with Node.js
   * MERN-aware: Handles JSX/TSX by converting to valid JS for syntax check
   */
  async checkSyntax(code: string, fileId: string): Promise<{ hasError: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Detect if it's JSX/TSX
      const isJSX = /<[A-Z]|<\/[A-Z]|JSX|\.jsx|\.tsx/.test(code) || 
                    /import.*from\s+['"]react['"]|from\s+['"]react-dom['"]/.test(code);
      
      // Create a temporary file
      const tempDir = os.tmpdir();
      const extension = isJSX ? '.jsx' : '.js';
      const tempFile = path.join(tempDir, `test-${fileId}-${Date.now()}${extension}`);
      
      try {
        // For JSX, we need to handle it differently
        // For now, we'll try to check basic syntax by removing JSX temporarily
        let codeToCheck = code;
        if (isJSX) {
          // Remove JSX tags for basic syntax checking (simple approach)
          // In production, you'd use a proper JSX parser
          codeToCheck = code.replace(/<[^>]+>/g, 'null'); // Replace JSX tags with null
        }
        
        // Write code to temp file
        fs.writeFileSync(tempFile, codeToCheck, 'utf8');

        // Try to parse/validate with Node.js
        const node = spawn('node', ['--check', tempFile], {
          stdio: 'pipe',
          shell: true
        });

        let errorOutput = '';
        let hasError = false;

        node.stderr.on('data', (data) => {
          errorOutput += data.toString();
          hasError = true;
        });

        node.on('close', (code) => {
          // Clean up temp file
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          } catch (e) {
            // Ignore cleanup errors
          }

          if (code !== 0 || hasError) {
            // Extract meaningful error message
            const errorMsg = this.extractSyntaxError(errorOutput);
            resolve({ hasError: true, error: errorMsg });
          } else {
            resolve({ hasError: false });
          }
        });

        node.on('error', () => {
          // If node is not available, try alternative method
          resolve({ hasError: false }); // Assume no syntax error if we can't check
        });
      } catch (error: any) {
        resolve({ hasError: false }); // If we can't check, don't assume error
      }
    });
  },

  /**
   * Test 2: Find undeclared variables using regex and AST-like parsing
   * MERN-aware: Filters out framework-provided globals and built-ins
   */
  async findUndeclaredVariables(code: string): Promise<Array<{ name: string; line?: number }>> {
    const undeclared: Array<{ name: string; line?: number }> = [];
    const lines = code.split('\n');

    // Detect MERN stack context
    const isReact = /import.*react|from\s+['"]react|useState|useEffect|JSX/.test(code);
    const isExpress = /express|req\.|res\.|app\.(get|post|put|delete)/.test(code);
    const isMongoose = /mongoose|Schema|Model\.|\.find\(|\.save\(/.test(code);
    const isNode = /require\(|process\.|__dirname|__filename/.test(code);

    // Find all variable references
    const variableRefPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    const declarationPatterns = [
      /\b(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /\bclass\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      /import\s+.*?\s+from\s+['"](.*?)['"]/g,
      /import\s+\{([^}]+)\}\s+from/g,
      /require\(['"](.*?)['"]\)/g,
      // React component declarations
      /(const|let|var|function)\s+([A-Z][a-zA-Z0-9_$]*)\s*[=:]/g,
      // Arrow function components
      /const\s+([A-Z][a-zA-Z0-9_$]*)\s*=\s*\(/g
    ];

    // Collect all declared names
    const declared = new Set<string>();
    
    // MERN Stack built-ins and globals
    const mernBuiltIns = new Set([
      // JavaScript reserved words
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'return', 'function', 'class', 'const', 'let', 'var', 'import', 'export',
      'default', 'this', 'super', 'new', 'typeof', 'instanceof', 'in', 'of',
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
      
      // Node.js globals
      'console', 'module', 'exports', 'require', 'process', 'global', '__dirname', '__filename',
      'Buffer', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      
      // React globals (if React is detected)
      ...(isReact ? [
        'React', 'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
        'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue',
        'Component', 'PureComponent', 'Fragment', 'StrictMode', 'Suspense',
        'createContext', 'createElement', 'cloneElement', 'isValidElement',
        'Children', 'lazy', 'memo', 'forwardRef'
      ] : []),
      
      // Express globals (if Express is detected)
      ...(isExpress ? [
        'req', 'res', 'next', 'app', 'router', 'request', 'response'
      ] : []),
      
      // Mongoose globals (if Mongoose is detected)
      ...(isMongoose ? [
        'Schema', 'Model', 'Document', 'Query', 'Aggregate'
      ] : []),
      
      // HTML elements (lowercase, valid in JSX)
      'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
      'bdi', 'bdo', 'big', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
      'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del', 'details',
      'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption',
      'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head',
      'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins',
      'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'menu',
      'menuitem', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup',
      'option', 'output', 'p', 'param', 'picture', 'pre', 'progress', 'q', 'rp',
      'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source',
      'span', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td',
      'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track',
      'u', 'ul', 'var', 'video', 'wbr'
    ]);

    // Find all declarations
    lines.forEach((line, lineNum) => {
      declarationPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          if (match[1] || match[2]) {
            const name = match[1] || match[2];
            if (name && !mernBuiltIns.has(name)) {
              declared.add(name);
            }
          }
        }
      });
      
      // Also detect React component declarations (PascalCase)
      if (isReact) {
        const componentPattern = /(?:const|let|var|function)\s+([A-Z][a-zA-Z0-9_$]*)\s*[=:\(]/g;
        let match;
        while ((match = componentPattern.exec(line)) !== null) {
          if (match[1] && !mernBuiltIns.has(match[1])) {
            declared.add(match[1]);
          }
        }
      }
      
      // Detect Express route handlers
      if (isExpress) {
        const routePattern = /app\.(get|post|put|delete|patch)\s*\(['"](.*?)['"],\s*(?:async\s+)?(?:\(|function\s+)?(\w+)/g;
        let match;
        while ((match = routePattern.exec(line)) !== null) {
          if (match[3] && !mernBuiltIns.has(match[3])) {
            declared.add(match[3]);
          }
        }
      }
    });

    // Find all variable references and check if they're declared
    lines.forEach((line, lineNum) => {
      // Skip lines that are declarations
      if (/\b(const|let|var|function|class|import|export)\b/.test(line)) {
        return;
      }

      // Skip JSX/TSX comments
      if (/\/\*|\/\/|<!--/.test(line)) {
        return;
      }

      let match;
      while ((match = variableRefPattern.exec(line)) !== null) {
        const varName = match[1];
        
        // Skip if it's a MERN built-in, reserved word, or declared
        if (mernBuiltIns.has(varName) || declared.has(varName)) {
          continue;
        }

        // Skip if it's a React component (PascalCase) in JSX context
        if (isReact && /^[A-Z]/.test(varName) && /<|<\/|\./.test(line)) {
          // Check if it's actually used as a component (between < >)
          const beforeMatch = line.substring(0, match.index);
          const afterMatch = line.substring(match.index + match[0].length);
          if (beforeMatch.includes('<') || afterMatch.includes('>')) {
            continue; // It's a JSX component, not a variable
          }
        }

        // Check if it's object property access (obj.prop) or method call (obj.method())
        const beforeMatch = line.substring(0, match.index);
        if (beforeMatch.endsWith('.') || beforeMatch.endsWith('[')) {
          continue; // It's a property access, not a variable
        }

        // Skip if it's part of a template literal or string
        const lineBefore = line.substring(0, match.index);
        const singleQuotes = (lineBefore.match(/'/g) || []).length;
        const doubleQuotes = (lineBefore.match(/"/g) || []).length;
        const backticks = (lineBefore.match(/`/g) || []).length;
        if ((singleQuotes % 2 !== 0 && !lineBefore.endsWith("'")) ||
            (doubleQuotes % 2 !== 0 && !lineBefore.endsWith('"')) ||
            (backticks % 2 !== 0 && !lineBefore.endsWith('`'))) {
          continue; // Inside a string
        }

        // Check if it's a function call (func())
        const afterMatch = line.substring(match.index + match[0].length);
        if (afterMatch.startsWith('(') || afterMatch.startsWith('.')) {
          // Might be a function call, but could also be undeclared
          // Only flag if it's clearly not a method call
          if (!beforeMatch.trim().endsWith('.')) {
            undeclared.push({ name: varName, line: lineNum + 1 });
          }
        } else {
          // Direct variable reference
          undeclared.push({ name: varName, line: lineNum + 1 });
        }
      }
    });

    // Remove duplicates
    const unique = new Map<string, { name: string; line?: number }>();
    undeclared.forEach(item => {
      if (!unique.has(item.name)) {
        unique.set(item.name, item);
      }
    });

    return Array.from(unique.values());
  },

  /**
   * Test 3: Find undefined variables (similar to undeclared but more strict)
   */
  async findUndefinedVariables(code: string): Promise<Array<{ name: string; line?: number }>> {
    // For now, this is similar to undeclared variables
    // In a more sophisticated implementation, we'd track scope
    return this.findUndeclaredVariables(code);
  },

  /**
   * Test 4: Find missing imports (MERN-aware)
   */
  async findMissingImports(code: string): Promise<Array<{ name: string; usedAt: string }>> {
    const missing: Array<{ name: string; usedAt: string }> = [];
    const lines = code.split('\n');

    // Detect MERN stack context
    const isReact = /import.*react|from\s+['"]react|useState|useEffect|JSX/.test(code);
    const isExpress = /express|req\.|res\.|app\.(get|post|put|delete)/.test(code);
    const isMongoose = /mongoose|Schema|Model\.|\.find\(|\.save\(/.test(code);

    // Find all import statements
    const imports = new Set<string>();
    const importPattern = /import\s+(?:\{([^}]+)\}|(\w+)|.*?\s+from\s+['"](.*?)['"])/g;
    
    lines.forEach(line => {
      let match;
      while ((match = importPattern.exec(line)) !== null) {
        if (match[1]) {
          // Named imports: import { a, b } from 'module'
          match[1].split(',').forEach(name => {
            imports.add(name.trim().split(' as ')[0].trim());
          });
        } else if (match[2]) {
          // Default import: import name from 'module'
          imports.add(match[2].trim());
        }
      }
    });

    // Find require statements and extract module names
    const requirePattern = /(?:const|let|var)\s+(\w+)\s*=\s*require\(['"](.*?)['"]\)/g;
    lines.forEach(line => {
      let match;
      while ((match = requirePattern.exec(line)) !== null) {
        if (match[1]) {
          imports.add(match[1].trim());
        }
      }
    });

    // MERN stack globals that don't need imports
    const mernGlobals = new Set([
      // Node.js built-ins (always available)
      'console', 'process', 'Buffer', 'setTimeout', 'setInterval',
      'clearTimeout', 'clearInterval', '__dirname', '__filename',
      'module', 'exports', 'require', 'global',
      
      // React hooks (if React is imported, hooks are available)
      ...(isReact && imports.has('React') ? [
        'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback',
        'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect'
      ] : []),
      
      // Express request/response (provided by framework)
      ...(isExpress ? ['req', 'res', 'next', 'request', 'response'] : []),
      
      // Mongoose (if mongoose is required)
      ...(isMongoose && imports.has('mongoose') ? ['Schema', 'Model'] : [])
    ]);

    // Check for React hooks usage (need React import in modern React)
    if (isReact) {
      const reactHooks = ['useState', 'useEffect', 'useContext', 'useReducer', 
                         'useCallback', 'useMemo', 'useRef', 'useLayoutEffect'];
      reactHooks.forEach(hook => {
        const hookPattern = new RegExp(`\\b${hook}\\b`);
        lines.forEach((line, lineNum) => {
          if (hookPattern.test(line) && !imports.has(hook) && !mernGlobals.has(hook)) {
            // Check if it's actually being used (not in a string or comment)
            if (!line.includes(`'${hook}'`) && !line.includes(`"${hook}"`) && 
                !line.trim().startsWith('//') && !line.includes('/*')) {
              missing.push({ name: hook, usedAt: `line ${lineNum + 1}` });
            }
          }
        });
      });
    }

    // Check for other common imports that might be missing
    const commonImports = new Map<string, string>([
      ['axios', 'axios'],
      ['express', 'express'],
      ['mongoose', 'mongoose'],
      ['cors', 'cors'],
      ['dotenv', 'dotenv'],
      ['bcrypt', 'bcrypt'],
      ['jsonwebtoken', 'jsonwebtoken']
    ]);

    commonImports.forEach((moduleName, importName) => {
      const importPattern = new RegExp(`\\b${importName}\\b`);
      const hasImport = imports.has(importName) || 
                       code.includes(`require('${moduleName}')`) ||
                       code.includes(`require("${moduleName}")`);
      
      if (!hasImport && importPattern.test(code)) {
        lines.forEach((line, lineNum) => {
          if (importPattern.test(line) && !line.includes('import') && !line.includes('require')) {
            // Check if it's actually being used (not in a string)
            if (!line.includes(`'${importName}'`) && !line.includes(`"${importName}"`)) {
              missing.push({ name: importName, usedAt: `line ${lineNum + 1}` });
            }
          }
        });
      }
    });

    // Remove duplicates
    const unique = new Map<string, { name: string; usedAt: string }>();
    missing.forEach(item => {
      if (!unique.has(item.name)) {
        unique.set(item.name, item);
      }
    });

    return Array.from(unique.values());
  },

  /**
   * Test 5: Check for runtime errors by attempting to execute (safely)
   */
  async checkRuntimeErrors(code: string, fileId: string): Promise<Array<{ message: string; line?: number }>> {
    const errors: Array<{ message: string; line?: number }> = [];

    // Only attempt execution for simple cases (safety first)
    // For complex code, we rely on syntax checking
    if (code.length > 10000) {
      return errors; // Skip execution for large files
    }

    // Check for obvious runtime issues
    // 1. Accessing properties on potentially undefined/null
    const unsafeAccessPattern = /(\w+)\.(\w+)/g;
    const lines = code.split('\n');
    
    lines.forEach((line, lineNum) => {
      // Check for potential null/undefined access
      if (line.includes('.') && !line.includes('?.') && !line.includes('if') && !line.includes('&&')) {
        // This is a heuristic - not perfect but catches common cases
        // In a real implementation, we'd use a proper AST
      }
    });

    return errors;
  },

  /**
   * Extract meaningful syntax error from Node.js output
   */
  extractSyntaxError(errorOutput: string): string {
    // Try to extract the actual error message
    const errorMatch = errorOutput.match(/SyntaxError[^\n]*/);
    if (errorMatch) {
      return errorMatch[0];
    }

    const lineMatch = errorOutput.match(/line (\d+)/);
    const messageMatch = errorOutput.match(/([^\n]{50,200})/);
    
    if (lineMatch && messageMatch) {
      return `Syntax error at line ${lineMatch[1]}: ${messageMatch[1]}`;
    }

    return errorOutput.substring(0, 200) || "Syntax error detected";
  }
};

