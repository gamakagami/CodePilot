import { Anthropic } from "@anthropic-ai/sdk";
import { TextBlock } from "@anthropic-ai/sdk/resources/messages";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("Missing ANTHROPIC_API_KEY in .env");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function runClaude(prompt: string) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find(
      (block): block is TextBlock => block.type === "text"
    );

    if (!textBlock) {
      throw new Error("No text block found in Claude response");
    }

    return textBlock.text;
  } catch (err) {
    console.error("Claude API error:", err);
    throw new Error("Claude analysis failed");
  }
}