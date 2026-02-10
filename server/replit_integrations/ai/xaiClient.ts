type XaiChatRole = "system" | "user" | "assistant";

export type XaiChatMessage = {
  role: XaiChatRole;
  content: string;
};

type XaiChatCompletionRequest = {
  model: string;
  messages: XaiChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
};

type XaiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      role?: XaiChatRole;
      content?: string;
    };
  }>;
};

export class XaiClientError extends Error {
  status?: number;
  body?: unknown;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new XaiClientError(`${name} is not configured`);
  }
  return value;
}

export function isXaiConfigured(): boolean {
  return !!process.env.XAI_API_KEY;
}

export async function createChatCompletion(params: {
  messages: XaiChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getRequiredEnv("XAI_API_KEY");
  const model = params.model || process.env.XAI_MODEL || "grok-4-latest";

  const body: XaiChatCompletionRequest = {
    model,
    messages: params.messages,
    stream: false,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
  };

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = new XaiClientError(`xAI request failed (${response.status})`);
    err.status = response.status;
    try {
      err.body = await response.json();
    } catch {
      err.body = await response.text().catch(() => undefined);
    }
    throw err;
  }

  const data = (await response.json()) as XaiChatCompletionResponse;
  return data.choices?.[0]?.message?.content || "";
}
