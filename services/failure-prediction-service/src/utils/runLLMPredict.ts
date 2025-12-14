import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function runLLMPredict(analysis: any): Promise<any> {
  const prompt = `
You are an expert at predicting actual test failures and production issues in MERN stack applications.

CRITICAL RULE: You must have CONCRETE EVIDENCE of a failure-causing issue to predict failure. If you cannot point to a specific bug or breaking change, predict PASS.

## Analysis Data:
${JSON.stringify(analysis, null, 2)}

## Your Prediction Methodology:

**BEFORE predicting failure, you MUST identify at least ONE of these CONCRETE issues:**

### CONCRETE FAILURE CAUSES (These actually break code):

1. **Syntax/Runtime Errors:**
   - Accessing properties on undefined/null (e.g., \`user.name\` when user could be null)
   - Calling non-existent functions or methods
   - Type errors in operations (e.g., doing math on strings)
   - Missing required function parameters
   - Using variables before declaration
   - Incorrect async/await usage causing unhandled rejections

2. **Breaking Changes:**
   - Function signature changed but callers not updated
   - API endpoint renamed but frontend still calls old endpoint
   - Required field removed from API response that frontend expects
   - Database schema changed without migration
   - Removed dependency that's still imported elsewhere

3. **Logic Bugs:**
   - Off-by-one errors in loops (e.g., \`i <= array.length\` instead of \`i < array.length\`)
   - Wrong comparison operators (e.g., \`==\` vs \`===\`, \`>\` vs \`>=\`)
   - Missing return statements in functions that should return values
   - Incorrect conditional logic (e.g., \`if (x = 5)\` instead of \`if (x === 5)\`)
   - Division by zero or math errors

4. **Integration Failures:**
   - API endpoint path doesn't match between frontend and backend
   - HTTP method mismatch (frontend sends POST, backend expects GET)
   - Request body format doesn't match what backend expects
   - Missing required headers or authentication tokens
   - CORS configuration prevents valid requests

5. **Critical Missing Error Handling:**
   - Async database operations without try-catch in critical paths (auth, payments, checkout)
   - No error handling when making external API calls
   - File operations without error handling
   - Network requests without error handling

### NON-ISSUES (Do NOT predict failure for these):

❌ Missing best practices (code works, just not optimal)
❌ High complexity (complexity doesn't cause failures by itself)
❌ Long functions (length doesn't cause failures)
❌ Missing comments or documentation
❌ Console.log statements
❌ Not using TypeScript (if JavaScript code is valid)
❌ Not using proper error handling in non-critical paths
❌ Missing input validation (if data source is trusted)
❌ Not following design patterns
❌ Performance issues (unless they cause timeouts)
❌ Code style violations
❌ Missing tests (tests don't affect code execution)

## Prediction Process:

### Step 1: Search for Concrete Issues
Look through the code/analysis for:
- Obvious bugs or errors
- Breaking changes to existing APIs/functions
- Missing required dependencies
- Type mismatches
- Logic errors

### Step 2: Can You Prove It Will Fail?
Ask yourself:
- Can I point to a specific line/pattern that will cause a runtime error?
- Can I explain exactly HOW this will break?
- Is there a concrete bug, not just a style issue?

### Step 3: Make Your Prediction
- If YES → Predict failure (0.5-1.0 probability)
- If NO → Predict pass (0.0-0.4 probability)
- If UNSURE → Default to pass (0.2-0.3 probability)

## Examples of Valid Failure Predictions:

✅ VALID: "Code accesses req.user.email without checking if req.user exists - will crash with TypeError"
✅ VALID: "Function expects 3 parameters but is being called with 2 - will produce undefined values"
✅ VALID: "API endpoint changed from /api/users to /api/v2/users but frontend still calls /api/users - 404 error"
✅ VALID: "Array index uses <= length instead of < length - will access undefined on last iteration"
✅ VALID: "Async function in payment processing has no try-catch - unhandled rejections will crash the app"

## Examples of Invalid Failure Predictions:

❌ INVALID: "Function has cyclomatic complexity of 12 - likely to fail"
   - Why invalid: Complexity doesn't cause failures, bugs do

❌ INVALID: "No input validation on this endpoint - will fail"
   - Why invalid: If data source is controlled/trusted, it may work fine

❌ INVALID: "Missing error handling - will fail"
   - Why invalid: Code works even without error handling in many cases

❌ INVALID: "Not following REST conventions - will fail"
   - Why invalid: Non-standard APIs still work

❌ INVALID: "Function is 100 lines long - will fail"
   - Why invalid: Length doesn't cause failures

## Risk Assessment Guidelines:

**Predict HIGH failure (0.7-1.0) when:**
- Multiple concrete bugs identified
- Breaking change in critical path (auth, payments, data mutations)
- Clear runtime error that will definitely crash
- API contract broken between frontend/backend

**Predict MEDIUM failure (0.4-0.6) when:**
- One concrete bug in non-critical path
- Potential race condition that may trigger
- Edge case that's likely to be hit
- Missing error handling in moderately critical path

**Predict LOW failure (0.1-0.3) when:**
- No concrete bugs found
- Code quality issues only
- Changes are isolated and well-tested
- Refactoring without logic changes

**Predict VERY LOW failure (0.0-0.1) when:**
- Code is clearly correct
- Good test coverage
- Small, safe changes
- Type safety prevents errors

## Your Response Format:

Respond with JSON in this format:
{
  "predicted_failure": 0 or 1,
  "failure_probability": 0.0 to 1.0,
  "reasoning": "Brief explanation of why you predict pass or fail. If predicting failure, cite the specific bug/issue."
}

RULES:
1. Use predicted_failure = 1 ONLY if failure_probability >= 0.5
2. If predicting failure, your "reasoning" MUST cite a specific concrete issue
3. If you cannot cite a specific bug, you MUST predict pass
4. "Bad practices" or "complexity" are NOT valid reasons for failure prediction
5. When in doubt, predict PASS - false positives are worse than false negatives

Remember: Working code with bad practices is still working code. Only predict failure if you can prove it will break.
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
