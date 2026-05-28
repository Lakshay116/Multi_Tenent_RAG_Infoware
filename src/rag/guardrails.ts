const PROMPT_INJECTION_PATTERNS = [
  "ignore previous instructions",
  "reveal system prompt",
  "act as",
  "bypass",
  "developer message"
];

const OUT_OF_SCOPE_PATTERNS = ["weather", "stock price", "sports score", "politics"];

export function detectPromptInjection(query: string): boolean {
  const lower = query.toLowerCase();
  return PROMPT_INJECTION_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function detectOutOfScopeQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function safeFallback(message: string) {
  return {
    answer: message,
    sources: [],
    confidence: 0
  };
}
