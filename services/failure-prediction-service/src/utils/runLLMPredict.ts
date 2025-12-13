import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function runLLMPredict(analysis: any): Promise<any> {
  const prompt = `
You are a MERN stack code review risk predictor.
Focus ONLY on MongoDB, Express, React, and Node.js projects.

You are given a full analysis of a pull request, including:
- Abstract Syntax Tree (AST)
- Functions and imports
- Code metrics (lines, complexity, etc.)
- Dependency graph (direct, reverse, cycles, impact radius)
- Similar code patterns with similarity scores
- MERN-specific patterns (error handling, validation, MongoDB usage, Express usage, potential issues)
- Warnings
- Numeric prediction features (timestamp, developer, module_type, lines_added, lines_deleted, files_changed, avg_function_complexity, code_coverage_change, build_duration, contains_test_changes, previous_failure_rate)

Use ALL of this information to estimate the probability that tests will fail.
Consider MERN-specific issues such as:
- Missing try/catch in async Express routes
- Lack of validation middleware
- Incorrect MongoDB schema usage
- Poor React component state handling
- Coupling issues between frontend and backend
- Build/test pipeline reliability

Analysis JSON:
${JSON.stringify(analysis, null, 2)}

Respond ONLY in strict JSON with this schema:
{
  "predicted_failure": 0 or 1,
  "failure_probability": float between 0 and 1
}
Do not include explanations, text, or extra fields.
`;


  const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

  const block = response.content.find(b => b.type === "text");
  if (!block || !("text" in block)) {
    throw new Error("No valid text block returned from Claude");
  }

  try {
    return JSON.parse(block.text);
  } catch (err) {
    throw new Error("Failed to parse LLM response: " + block.text);
  }
}
