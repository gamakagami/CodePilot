import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function runLLMPredict(analysis: any): Promise<any> {
  const prompt = `
You are an expert MERN stack code review risk predictor with deep knowledge of MongoDB, Express.js, React, and Node.js ecosystems.

Analyze the following pull request data to predict the probability of test failures or production issues.

## Analysis Data:
${JSON.stringify(analysis, null, 2)}

## MERN Stack Risk Assessment Criteria:

### Backend (Node.js + Express + MongoDB):
1. **Error Handling:**
   - Async/await wrapped in try-catch blocks
   - Global error middleware implemented
   - Unhandled promise rejection handlers
   - MongoDB connection error handling

2. **Security:**
   - Input validation (express-validator, Joi, Zod)
   - SQL/NoSQL injection prevention
   - Rate limiting middleware
   - CORS configuration
   - Helmet.js security headers
   - Authentication/authorization (JWT, sessions)
   - Environment variables for secrets

3. **MongoDB Best Practices:**
   - Proper schema design with Mongoose
   - Index usage for queries
   - Connection pooling
   - Transaction handling for multi-document operations
   - Mongoose middleware (pre/post hooks)
   - Proper error handling for DB operations
   - Avoiding deprecated methods

4. **Express Patterns:**
   - Route organization and modularity
   - Middleware order (body-parser, CORS, auth, routes, error)
   - Request validation before DB operations
   - Response status codes consistency
   - API versioning
   - Proper use of next() in middleware

5. **Node.js Concerns:**
   - Memory leaks (event listeners, timers)
   - Blocking operations in event loop
   - Proper stream handling
   - File system operations safety
   - Child process security

### Frontend (React):
1. **Component Architecture:**
   - Proper component composition
   - Appropriate use of hooks (useState, useEffect, useMemo, useCallback)
   - Avoiding unnecessary re-renders
   - Custom hooks for reusable logic
   - Prop drilling vs context usage

2. **State Management:**
   - Local vs global state decisions
   - Redux/Context API patterns
   - Immutable state updates
   - Async action handling
   - State synchronization with backend

3. **Performance:**
   - Code splitting and lazy loading
   - Memoization (React.memo, useMemo)
   - Virtual scrolling for large lists
   - Debouncing/throttling user inputs
   - Image optimization

4. **Data Fetching:**
   - Proper API error handling
   - Loading and error states
   - Request cancellation (AbortController)
   - Caching strategies
   - Race condition prevention
   - React Query/SWR patterns

5. **Security:**
   - XSS prevention (proper escaping)
   - CSRF token handling
   - Secure storage of tokens (httpOnly cookies vs localStorage)
   - Input sanitization

### Full Stack Integration:
1. **API Design:**
   - RESTful conventions or GraphQL consistency
   - Consistent error response format
   - Pagination implementation
   - File upload handling (multer)
   - WebSocket integration (Socket.io)

2. **Type Safety:**
   - TypeScript usage on both ends
   - Shared type definitions
   - API contract validation
   - Zod/Yup schema matching

3. **Testing:**
   - Unit tests for utilities and helpers
   - Integration tests for API endpoints
   - React component testing (RTL)
   - E2E tests coverage
   - MongoDB in-memory server for tests
   - Proper test isolation and cleanup

4. **Build & Deployment:**
   - Environment-specific configs
   - Build optimization
   - Bundle size monitoring
   - Database migration strategy
   - Rollback procedures

### Code Quality Indicators:
- Cyclomatic complexity (>10 is risky)
- Function length (>50 lines is concerning)
- File size (>300 lines needs review)
- Dependency graph depth
- Code duplication
- Import cycles
- Dead code

### Risk Factors (High Priority):
- Changes to authentication/authorization logic
- Database schema modifications without migrations
- Middleware order changes
- CORS or security middleware removal
- Environment variable changes
- Dependency version updates (especially major)
- Error handling removal
- Test file deletion or skipping
- Direct MongoDB queries without validation
- useState in loops or conditions
- Missing useEffect dependencies
- Infinite re-render patterns

## Your Task:
Based on the analysis data and MERN best practices above, calculate:
1. Overall failure probability (0.0 to 1.0)
2. Binary prediction (0 = likely pass, 1 = likely fail)

Consider:
- Severity and quantity of anti-patterns
- Missing critical safeguards
- Complexity metrics
- Test coverage changes
- Historical failure patterns
- Code change size and scope

Respond ONLY with valid JSON in this exact format:
{
  "predicted_failure": 0 or 1,
  "failure_probability": 0.0 to 1.0
}

No additional text, explanations, or fields. Just pure JSON.
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
