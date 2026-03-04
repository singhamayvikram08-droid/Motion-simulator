import { OpenRouter } from "@openrouter/sdk";
import dotenv from "dotenv";
dotenv.config();

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

async function run() {
  try {
    const stream = await openrouter.chat.completions.create({
      model: "arcee-ai/trinity-large-preview:free",
      messages: [{ role: "user", content: "hello" }],
      stream: true
    });
    for await (const chunk of stream) {
        process.stdout.write(chunk.choices[0]?.delta?.content || "");
    }
  } catch(e) { console.error(e); }
}
run();
