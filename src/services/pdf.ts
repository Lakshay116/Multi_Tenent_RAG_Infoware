import pdf from "pdf-parse";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parsed = await pdf(buffer);
  return parsed.text.replace(/\s+/g, " ").trim();
}

