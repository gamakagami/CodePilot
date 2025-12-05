// llmClient.ts
import Anthropic from "@anthropic-ai/sdk";

export async function llmClient(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  // Extract text content from the response
  const textContent = message.content.find(block => block.type === 'text');
  return textContent?.type === 'text' ? textContent.text : '';
}