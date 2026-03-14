import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

const featherless = createOpenAICompatible({
  name: "featherless",
  baseURL: "https://api.featherless.ai/v1",
  apiKey:
    "***REDACTED_API_KEY***",
});

const { text } = await generateText({
  model: featherless.chatModel("zai-org/GLM-5"),
  maxTokens: 4096,
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    {
      role: "user",
      content: "What is the fastest way to get to the airport?",
    },
  ],
});

console.log(text);
