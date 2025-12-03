import Parser from "tree-sitter";
const TypeScriptLanguage = require("tree-sitter-typescript");

interface ParseResult {
  ast: any;
  functions: string[];
  imports: string[];
}

export class ParserService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    
    // Try different ways to access the language
    const language = TypeScriptLanguage.typescript || TypeScriptLanguage.default?.typescript || TypeScriptLanguage;
    
    console.log("TypeScript Language object:", TypeScriptLanguage);
    console.log("Extracted language:", language);
    
    this.parser.setLanguage(language);
  }

  parseCode(code: string): ParseResult {
    try {
      const tree = this.parser.parse(code);

      const functions = this.extractFunctions(tree, code);
      const imports = this.extractImports(tree, code);

      return {
        ast: tree.rootNode.toString(),
        functions,
        imports,
      };
    } catch (err) {
      console.error("Parse error:", err);
      throw new Error("Unable to parse code");
    }
  }

  private extractFunctions(tree: Parser.Tree, code: string): string[] {
    const funcNodes = tree.rootNode.descendantsOfType([
      "function_declaration",
      "method_definition",
      "arrow_function",
    ]);

    return funcNodes.map((node) => code.slice(node.startIndex, node.endIndex));
  }

  private extractImports(tree: Parser.Tree, code: string): string[] {
    const importNodes = tree.rootNode.descendantsOfType(["import_statement"]);

    return importNodes.map((node) => code.slice(node.startIndex, node.endIndex));
  }
}