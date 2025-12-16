# Code Analysis Service - Usage Analysis Report

## Overview
This report analyzes which functions are **used** vs **unused** when `analyzePR` is called from the user service. The flow goes:
1. User Service → Orchestrator Service → Code Analysis Service
2. Orchestrator calls `/analysis` endpoint (POST)
3. This calls `analysisService.analyze()`

---

## ✅ FUNCTIONS USED by `analyzePR` (via `analysisService.analyze()`)

### Analysis Service (`analysis.service.ts`)
**Main method:**
- ✅ `analyze(input: AnalysisInput)` - Main entry point

**Private methods called by `analyze()`:**
- ✅ `analyzeDependencies(fileId)` - Analyzes dependency graph
- ✅ `calculateMetrics(code, parsed)` - Calculates code metrics
- ✅ `calculateCyclomaticComplexity(code)` - Calculates complexity
- ✅ `detectMERNPatterns(code, parsed)` - Detects MERN-specific patterns
- ✅ `checkErrorHandling(code)` - Checks for error handling
- ✅ `extractImportPath(importStatement)` - Extracts import paths
- ✅ `buildPredictionFeatures(...)` - Builds ML prediction features
- ✅ `inferModuleType(imports, mernPatterns)` - Infers module type
- ✅ `detectTestChanges(fileId, imports)` - Detects test changes
- ✅ `getDefaultMERNPatterns()` - Returns default MERN patterns

### Parser Service (`parser.service.ts`)
- ✅ `parseCode(code: string)` - Main parsing method
  - ✅ `parseCodeChunked(code)` - For large files
  - ✅ `splitIntoFixedChunks(code, chunkSize)` - Splits large files
  - ✅ `deduplicateFunctions(functions)` - Deduplicates function list
  - ✅ `extractImportsRegex(code)` - Fallback regex import extraction
  - ✅ `extractFunctionsRegex(code)` - Fallback regex function extraction
  - ✅ `findMatchingBrace(code, startPos)` - Finds matching braces
  - ✅ `extractFunctions(tree, code)` - Tree-sitter function extraction
  - ✅ `extractImports(tree, code)` - Tree-sitter import extraction

### Graph Service (`graph.service.ts`)
- ✅ `registerFile(filePath)` - Registers file in Neo4j
- ✅ `linkDependency(source, target, type)` - Links dependencies in Neo4j
- ✅ `getDependencies(filePath)` - Gets direct dependencies
- ✅ `getReverseDependencies(filePath)` - Gets reverse dependencies
- ✅ `detectCycles(filePath)` - Detects circular dependencies
- ✅ `impactAnalysis(filePath)` - Performs impact analysis

### Embedding Service (`embed.service.ts`)
- ✅ `storeEmbedding(id, text)` - Stores code embedding in Pinecone
  - ✅ `generateEmbedding(text)` - Generates embedding via Cohere
- ✅ `searchSimilar(text, topK)` - Searches for similar code patterns
  - ✅ `generateEmbedding(text)` - Used again for search

### Analysis Controller (`analysis.controller.ts`)
- ✅ `analyze` - Main endpoint handler (POST /analysis)
  - ✅ `getComplexityRating(complexity)` - Helper for response
  - ✅ `assessIssueSeverity(issues)` - Helper for response
  - ✅ `calculateQualityScore(result)` - Helper for response

---

## ❌ FUNCTIONS NOT USED by `analyzePR`

### Analysis Controller (`analysis.controller.ts`)
**Unused endpoints (not routed):**
- ❌ `batchAnalyze` - Batch analysis endpoint (NOT in routes)
- ❌ `getRecommendations` - Recommendations endpoint (NOT in routes)

**Unused helper methods:**
- ❌ `buildRecommendations(patterns)` - Builds recommendation list (only used by `getRecommendations`)
- ❌ `getIssueDetails(issue)` - Gets details for specific issues (only used by `buildRecommendations`)

### Parse Module - Controllers & Routes
**Unused endpoints:**
- ❌ `POST /parse` - Standalone parse endpoint (not called by analyze)
  - ❌ `ParserController.parse` - Parse controller method

### Graph Module - Controllers & Routes
**Unused endpoints (all exposed but not called by analyze):**
- ❌ `POST /graph/register` - `GraphController.register`
- ❌ `POST /graph/link` - `GraphController.link`
- ❌ `GET /graph/dependencies/:file` - `GraphController.dependencies`
- ❌ `GET /graph/reverse-dependencies/:file` - `GraphController.reverseDependencies`
- ❌ `GET /graph/cycles/:file` - `GraphController.cycles`
- ❌ `GET /graph/impact/:file` - `GraphController.impact`

*Note: These are exposed as HTTP endpoints but `analyze()` calls the GraphService methods directly, not via HTTP.*

### Embeddings Module - Controllers & Routes
**Unused endpoints:**
- ❌ `POST /embeddings` - `EmbedController.embed` - Standalone embedding endpoint
- ❌ `POST /embeddings/search` - `EmbedController.search` - Standalone search endpoint

*Note: `analyze()` calls EmbeddingService methods directly, not via HTTP.*

---

## 📊 Summary Statistics

| Category | Used | Unused | Total |
|----------|------|--------|-------|
| **Analysis Service Methods** | 11 | 0 | 11 |
| **Parser Service Methods** | 9 | 0 | 9 |
| **Graph Service Methods** | 6 | 0 | 6 |
| **Embedding Service Methods** | 2 | 0 | 2 |
| **Analysis Controller Methods** | 1 | 2 | 3 |
| **HTTP Endpoints (Routes)** | 1 | 10 | 11 |
| **Total Functions Used** | 29 | 2 | 31 |
| **Total HTTP Endpoints** | 1 | 10 | 11 |

---

## 🔍 Key Findings

1. **All core service methods are used** - The internal service classes (ParserService, GraphService, EmbeddingService) have all their methods used by `analyze()`.

2. **Most HTTP endpoints are unused** - When `analyzePR` is called, it only uses `POST /analysis`. The other 10 endpoints (`/parse`, `/graph/*`, `/embeddings/*`) are exposed but not used in this flow.

3. **Two controller methods are unused** - `batchAnalyze` and `getRecommendations` exist but have no routes defined, making them completely inaccessible.

4. **Direct service calls vs HTTP calls** - The `analyze()` method calls service classes directly (e.g., `graphService.registerFile()`), not via HTTP endpoints. This means the HTTP endpoints like `/graph/register` are redundant for the `analyzePR` flow.

---

## 💡 Recommendations

1. **Remove unused controller methods** - `batchAnalyze` and `getRecommendations` can be removed if not needed, or add routes if they should be exposed.

2. **Consider removing standalone endpoints** - The `/parse`, `/graph/*`, and `/embeddings/*` endpoints appear to be for direct API access, but aren't used by `analyzePR`. Keep them if other services use them, otherwise remove.

3. **Documentation** - Consider documenting which endpoints are internal vs external API.

