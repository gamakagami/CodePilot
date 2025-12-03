import { anthropic } from "../../utils/anthropic";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatAnthropic } from "@langchain/anthropic";

class AnalysisService {
  private model: ChatAnthropic;

  constructor() {
    this.model = new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-sonnet-4-20250514",
    });
  }

  async analyze(code: string) {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are an expert code reviewer."],
      [
        "human",
        `Analyze this code:
{code}

1. Predict whether the PR will PASS or FAIL.
2. Provide detailed review comments.`
      ]
    ]);

    const chain = prompt.pipe(this.model);

    const response = await chain.invoke({ code }); // Pass code here!

    return {
      prediction: response.content.toString().includes("PASS") ? "PASS" : "FAIL",
      review: response.content.toString()
    };
  }
}

export default new AnalysisService();