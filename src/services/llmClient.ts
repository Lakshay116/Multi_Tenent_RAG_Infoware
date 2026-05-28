import { GoogleGenerativeAI } from "@google/generative-ai";

const chatModelName = process.env.CHAT_MODEL ?? "gemini-2.5-flash";
const embeddingModelName = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error("GEMINI_API_KEY is required when using Gemini.");
}

const genAI = new GoogleGenerativeAI(geminiApiKey);
const chatModel = genAI.getGenerativeModel({ model: chatModelName });
const embeddingModel = genAI.getGenerativeModel({ model: embeddingModelName });

export async function embedText(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const vectors: number[][] = [];
  for (const text of texts) {
    const result = await embeddingModel.embedContent(text);
    vectors.push(result.embedding.values);
  }
  return vectors;
}

export async function generateAnswer(prompt: string): Promise<string> {
  const result = await chatModel.generateContent(prompt);
  return result.response.text().trim() || "No answer generated.";
}
