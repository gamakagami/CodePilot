import { llmClient } from "../utils/llmClient";
import { ReviewRequest } from "../types/review.types";

export const reviewService = {
  async generateReviewComments({ code, language }: ReviewRequest) {
    const prompt = `
You are a senior software engineer. Review the following code and provide:

1. Summary of what the code does  
2. List of issues / bugs  
3. Code quality problems  
4. Best practice recommendations  
5. Improved version of the code (if needed)

Language: ${language ?? "auto-detect"}

Code:
${code}
`;

    return await llmClient(prompt);
  }
};
