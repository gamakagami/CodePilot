import Anthropic from "@anthropic-ai/sdk";

interface FileInput {
  filename: string;
  code: string;
}

interface FileAnalysis {
  filename: string;
  summary: string;
  issues: string[];
  score: number;
}

// Analyze a single file
async function analyzeFile(client: Anthropic, file: FileInput): Promise<FileAnalysis> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a code analyzer. Analyze the file and respond ONLY in this JSON format, no markdown:
{
  "summary": "1 sentence description",
  "issues": ["issue 1", "issue 2"],
  "score": 7
}

Focus on: bugs, security, performance, TypeScript issues, MERN best practices.`,
    messages: [
      { role: "user", content: `File: ${file.filename}\n\n${file.code}` }
    ]
  });

  const text = response.content.find(b => b.type === "text")?.text || "{}";
  const parsed = JSON.parse(text);
  
  return {
    filename: file.filename,
    summary: parsed.summary || "",
    issues: parsed.issues || [],
    score: parsed.score || 0
  };
}

// Merge all analyses into one summary
async function mergeSummaries(client: Anthropic, analyses: FileAnalysis[]): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are a code review summarizer. Given individual file analyses, create ONE unified codebase summary.

Format:
## Codebase Overview
[What does this codebase do overall]

## Critical Issues
[Top issues across all files, prioritized]

## File Breakdown
[Brief status of each file]

## Overall Score: X/10

## Top 3 Priorities
[Most important fixes]`,
    messages: [
      { role: "user", content: `File analyses:\n\n${JSON.stringify(analyses, null, 2)}` }
    ]
  });

  return response.content.find(b => b.type === "text")?.text || "No summary generated.";
}

// Main function: analyze entire codebase
export async function analyzeCodebase(files: FileInput[]): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Analyze all files in parallel
  const analyses = await Promise.all(
    files.map(file => analyzeFile(client, file))
  );

  // Merge into one summary
  const summary = await mergeSummaries(client, analyses);

  return summary;
}

// Keep single file analysis for backward compatibility
export async function analyzeCode(code: string): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `You are a code analysis AI for MERN Stack (TypeScript) applications.

Analyze the provided code and return a response in this exact format:

## Summary
[1-2 sentence overview of what the code does]

## Issues Found
[List each issue with severity: 🔴 Critical | 🟠 Warning | 🟡 Info]

## Recommendations
[Top 3 actionable improvements]

## Score
[Rate the code quality from 1-10]`,
    messages: [
      { role: "user", content: `Analyze this code:\n\n${code}` }
    ]
  });

  const textBlock = response.content.find(block => block.type === "text");
  return textBlock?.text || "No analysis returned.";
}