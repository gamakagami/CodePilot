import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";

interface ParseResult {
  ast: string;
  functions: string[];
  imports: string[];
}

export class ParserService {
  private parser: Parser;
  private readonly MAX_PARSE_SIZE = 10000; // Smaller: 10KB per chunk

  constructor() {
    this.parser = new Parser();
    
    try {
      this.parser.setLanguage(TypeScript.typescript);
      console.log("✅ Tree-sitter TypeScript parser initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Tree-sitter parser:", error);
      throw error;
    }
  }

  parseCode(code: string): ParseResult | null {
    if (typeof code !== "string" || code.trim().length === 0) {
      console.warn("Invalid input: code must be a non-empty string");
      return null;
    }

    if (code.length > this.MAX_PARSE_SIZE) {
      console.warn(`Code is too large (${code.length} chars), using chunked parsing...`);
      return this.parseCodeChunked(code);
    }

    try {
      console.log(`Parsing code (${code.length} characters)...`);
      
      const cleanCode = String(code);
      const tree = this.parser.parse(cleanCode);

      if (!tree || !tree.rootNode) {
        console.error("Parse failed: tree or rootNode is null");
        return null;
      }

      console.log(`✅ Successfully parsed code. Root node type: ${tree.rootNode.type}`);

      return {
        ast: tree.rootNode.toString(),
        functions: this.extractFunctions(tree, cleanCode),
        imports: this.extractImports(tree, cleanCode),
      };
    } catch (error) {
      console.error("Tree-sitter parse failed with error:", error);
      return null;
    }
  }

  private parseCodeChunked(code: string): ParseResult | null {
    try {
      const allFunctions: string[] = [];
      const allImports: string[] = [];
      
      // SIMPLE FIXED-SIZE CHUNKING with overlap
      const chunks = this.splitIntoFixedChunks(code, this.MAX_PARSE_SIZE);
      console.log(`Split large file into ${chunks.length} chunks`);
      
      chunks.forEach((chunk, i) => {
        console.log(`  Chunk ${i + 1} size: ${chunk.length} chars`);
      });

      let successfulChunks = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Parsing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);
        
        try {
          const tree = this.parser.parse(chunk);
          
          if (tree && tree.rootNode) {
            const functions = this.extractFunctions(tree, chunk);
            const imports = this.extractImports(tree, chunk);
            
            allFunctions.push(...functions);
            allImports.push(...imports);
            successfulChunks++;
            
            console.log(`  ✓ Chunk ${i + 1}: ${functions.length} functions, ${imports.length} imports`);
          } else {
            console.warn(`  ✗ Chunk ${i + 1}: Parse returned null`);
          }
        } catch (chunkError) {
          console.warn(`  ✗ Chunk ${i + 1}: ${chunkError}`);
        }
      }

      // Fallback regex extraction
      console.log("Running fallback regex extraction...");
      const regexImports = this.extractImportsRegex(code);
      const regexFunctions = this.extractFunctionsRegex(code);
      
      allImports.push(...regexImports);
      allFunctions.push(...regexFunctions);

      const uniqueImports = [...new Set(allImports)];
      const uniqueFunctions = this.deduplicateFunctions(allFunctions);

      console.log(`✅ Chunked parsing complete: ${successfulChunks}/${chunks.length} chunks successful`);
      console.log(`   Total (deduplicated): ${uniqueFunctions.length} functions, ${uniqueImports.length} imports`);

      return {
        ast: `[Chunked AST - ${successfulChunks}/${chunks.length} chunks parsed]`,
        functions: uniqueFunctions,
        imports: uniqueImports,
      };
    } catch (error) {
      console.error("Chunked parsing failed:", error);
      return null;
    }
  }

  /**
   * Split into fixed-size chunks with overlap to avoid cutting functions
   */
  private splitIntoFixedChunks(code: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const lines = code.split('\n');
    
    // Extract imports to prepend to each chunk
    const imports = lines
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('import ') || (trimmed.startsWith('export ') && trimmed.includes(' from '));
      })
      .slice(0, 30);
    
    const importBlock = imports.join('\n');
    const overlapSize = 500; // 500 chars overlap between chunks
    
    let currentChunk: string[] = [...imports];
    let currentSize = importBlock.length;
    let lastChunkEnd = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineSize = line.length + 1;
      
      // Force split when we hit the size limit
      if (currentSize + lineSize > chunkSize && currentChunk.length > imports.length) {
        chunks.push(currentChunk.join('\n'));
        
        // Start new chunk with imports + overlap from previous chunk
        const overlapLines: string[] = [];
        let overlapBytes = 0;
        
        // Add lines from the end of current chunk for overlap
        for (let j = currentChunk.length - 1; j >= imports.length && overlapBytes < overlapSize; j--) {
          overlapLines.unshift(currentChunk[j]);
          overlapBytes += currentChunk[j].length;
        }
        
        currentChunk = [...imports, ...overlapLines];
        currentSize = imports.join('\n').length + overlapBytes;
        lastChunkEnd = i;
      }
      
      currentChunk.push(line);
      currentSize += lineSize;
    }
    
    // Add final chunk
    if (currentChunk.length > imports.length) {
      chunks.push(currentChunk.join('\n'));
    }
    
    return chunks;
  }

  /**
   * Deduplicate functions by comparing first 100 chars
   */
  private deduplicateFunctions(functions: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    
    for (const fn of functions) {
      const signature = fn.substring(0, 100).trim();
      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(fn);
      }
    }
    
    return unique;
  }

  /**
   * Extract imports using regex
   */
  private extractImportsRegex(code: string): string[] {
    const importRegex = /import\s+(?:(?:\{[^}]*\})|(?:\*\s+as\s+\w+)|(?:\w+))(?:\s*,\s*(?:\{[^}]*\}|\w+))?\s+from\s+['"][^'"]+['"];?/gm;
    const matches = code.match(importRegex) || [];
    return matches.map(m => m.trim());
  }

  /**
   * Extract function declarations using regex
   */
  private extractFunctionsRegex(code: string): string[] {
    const functions: string[] = [];
    
    // Match various function patterns
    const patterns = [
      // function declarations: function name() {}
      /(?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g,
      // arrow functions: const name = () => {}
      /(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*\{/g,
      // class methods: methodName() {}
      /(?:async\s+)?\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const start = match.index;
        const openBrace = code.indexOf('{', start);
        if (openBrace !== -1) {
          const end = this.findMatchingBrace(code, openBrace);
          if (end !== -1) {
            const func = code.substring(start, end + 1);
            // Only add if it looks like a real function (has some content)
            if (func.length > 20) {
              functions.push(func);
            }
          }
        }
      }
    }
    
    return functions;
  }

  /**
   * Find matching closing brace
   */
  private findMatchingBrace(code: string, startPos: number): number {
    let depth = 1;
    for (let i = startPos + 1; i < code.length && i < startPos + 10000; i++) {
      if (code[i] === '{') depth++;
      if (code[i] === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  private extractFunctions(tree: Parser.Tree, code: string): string[] {
    try {
      const funcNodes = tree.rootNode.descendantsOfType([
        "function_declaration",
        "method_definition",
        "arrow_function",
        "function_expression",
      ]);

      return funcNodes.map(node =>
        code.slice(node.startIndex, node.endIndex)
      );
    } catch (error) {
      console.error("Error extracting functions:", error);
      return [];
    }
  }

  private extractImports(tree: Parser.Tree, code: string): string[] {
    try {
      const importNodes = tree.rootNode.descendantsOfType([
        "import_statement",
      ]);

      return importNodes.map(node =>
        code.slice(node.startIndex, node.endIndex)
      );
    } catch (error) {
      console.error("Error extracting imports:", error);
      return [];
    }
  }
}