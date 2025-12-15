import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function runLLMPredict(analysis: any): Promise<any> {
  const prompt = `You are a code analyzer that predicts if code changes will cause failures.

ANALYSIS DATA:
${JSON.stringify(analysis, null, 2)}

YOUR TASK:
Analyze this code/change data and determine if it will cause a runtime failure.

WHAT COUNTS AS A FAILURE (predict failure_probability >= 0.5):

1. UNDEFINED VARIABLES/PROPERTIES
   - Using variables that don't exist
   - Accessing properties on undefined/null (e.g., user.name when user is null)
   - Typos in variable names

2. SYNTAX/TYPE ERRORS
   - Missing required parameters in function calls
   - Wrong data types (doing math on strings, etc.)
   - Missing return statements where required
   - Assignment in conditionals (if (x = 5) instead of if (x === 5))

3. LOGIC BUGS
   - Off-by-one errors (i <= array.length instead of i < array.length)
   - Wrong operators (> instead of >=, == instead of ===)
   - Incorrect conditions that always/never trigger

4. BREAKING CHANGES
   - Changed function signatures without updating callers
   - Renamed/removed API endpoints still being called
   - Changed database fields still being accessed
   - Removed dependencies still being imported

5. INTEGRATION FAILURES
   - Frontend calling wrong API endpoint
   - HTTP method mismatches (POST vs GET)
   - Missing required headers/auth tokens
   - Request/response format mismatches

WHAT DOES NOT COUNT AS FAILURE (predict failure_probability < 0.5):

- High complexity (code still works)
- Long functions (length doesn't break code)
- Missing comments
- Console.log statements
- Code style issues
- Missing tests
- Performance issues (unless causing timeout)
- Missing error handling (code still executes)
- Missing validation (if data source is trusted)

ANALYSIS APPROACH:

1. Look for concrete bugs in the data
2. Check if any variables/functions are used but not defined. NAME the exact identifier you found (no generic phrases).
3. Check for breaking changes to APIs/contracts
4. Check for logic errors in conditions/loops
5. If you find a CONCRETE bug → predict FAILURE (0.5-1.0)
6. If no concrete bugs found → predict PASS (0.0-0.4)

CRITICAL FORMATTING RULES:
1. Return ONLY valid JSON
2. Use single spaces in reasoning, NO line breaks or tabs
3. Keep reasoning under 200 characters
4. No special characters in strings
5. If mentioning undefined/missing items, include the exact variable/property/pattern name from the code (e.g., "undefined variable userToken").

RESPONSE FORMAT:
Return ONLY a JSON object on a single line:

{"predicted_failure": 0 or 1, "failure_probability": 0.0-1.0, "reasoning": "Brief single-line explanation"}

RULES:
- predicted_failure = 1 if failure_probability >= 0.5
- predicted_failure = 0 if failure_probability < 0.5
- If you see an undefined variable/function → ALWAYS predict failure
- If you see a breaking change → ALWAYS predict failure
- If you only see style/complexity issues → ALWAYS predict pass
- When uncertain → predict pass (0.2-0.3 probability)
- Return ONLY the JSON object on ONE LINE
- NO line breaks in reasoning field

Now analyze the data and make your prediction:`;

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
    // Extract and clean the response text
    let text = block.text.trim();
    
    console.log("Raw LLM Response:", text);
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/\n?```/g, '');
    
    // Clean up control characters and excess whitespace in the entire response
    text = text
      .replace(/[\n\r\t]/g, ' ')  // Replace newlines, returns, tabs with spaces
      .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
      .trim();
    
    // Try to find JSON object in the text
    const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (!jsonMatch) {
      throw new Error(`No JSON object found in response: ${text.substring(0, 200)}...`);
    }
    
    let jsonStr = jsonMatch[0];
    
    // Additional cleaning for the JSON string
    // Fix common issues with quotes and control characters
    jsonStr = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')  // Remove control characters
      .replace(/\s+/g, ' ')  // Normalize whitespace again
      .trim();
    
    console.log("Cleaned JSON string:", jsonStr);
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate the response has required fields
    if (typeof parsed.predicted_failure === 'undefined' || 
        typeof parsed.failure_probability === 'undefined') {
      throw new Error('Response missing required fields');
    }
    
    return parsed;
    
  } catch (err: any) {
    console.error("Full LLM Response:", block.text);
    console.error("Parse error:", err.message);
    
    // Return a safe fallback
    return {
      predicted_failure: 0,
      failure_probability: 0.3,
      reasoning: "Failed to parse LLM response, defaulting to pass"
    };
  }
}