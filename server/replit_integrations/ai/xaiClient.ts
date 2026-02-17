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

const XAI_REQUEST_TIMEOUT_MS = 20000;
const XAI_MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientStatus(status?: number): boolean {
  if (!status) return true;
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function normalizeErrorBody(body: unknown): string | undefined {
  if (!body) return undefined;
  if (typeof body === "string") return body;
  if (typeof body === "object") {
    try {
      return JSON.stringify(body);
    } catch {
      return undefined;
    }
  }
  return undefined;
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

  const modelCandidates = Array.from(new Set([model, "grok-4-latest"]));
  let lastError: XaiClientError | null = null;

  for (const modelCandidate of modelCandidates) {
    for (let attempt = 0; attempt <= XAI_MAX_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), XAI_REQUEST_TIMEOUT_MS);

      try {
        const body: XaiChatCompletionRequest = {
          model: modelCandidate,
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
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = new XaiClientError(`xAI request failed (${response.status})`);
          err.status = response.status;
          try {
            err.body = await response.json();
          } catch {
            err.body = await response.text().catch(() => undefined);
          }
          lastError = err;

          const shouldRetry = isTransientStatus(response.status) && attempt < XAI_MAX_RETRIES;
          if (shouldRetry) {
            await sleep(350 * Math.pow(2, attempt));
            continue;
          }

          // If selected model failed due model-specific issue, fallback to default model candidate.
          if ((response.status === 400 || response.status === 404) && modelCandidate !== "grok-4-latest") {
            break;
          }

          throw err;
        }

        const data = (await response.json()) as XaiChatCompletionResponse;
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;

        const emptyError = new XaiClientError("xAI returned an empty completion");
        emptyError.status = 502;
        emptyError.body = data;
        lastError = emptyError;

        const shouldRetry = attempt < XAI_MAX_RETRIES;
        if (shouldRetry) {
          await sleep(300 * Math.pow(2, attempt));
          continue;
        }
      } catch (error: any) {
        if (error?.name === "AbortError") {
          const timeoutError = new XaiClientError("xAI request timed out");
          timeoutError.status = 408;
          lastError = timeoutError;
        } else if (error instanceof XaiClientError) {
          lastError = error;
        } else {
          const networkError = new XaiClientError("xAI network request failed");
          networkError.body = normalizeErrorBody(error?.message ?? error);
          lastError = networkError;
        }

        const shouldRetry = isTransientStatus(lastError.status) && attempt < XAI_MAX_RETRIES;
        if (shouldRetry) {
          await sleep(350 * Math.pow(2, attempt));
          continue;
        }

        if (modelCandidate !== "grok-4-latest" && (lastError.status === 400 || lastError.status === 404)) {
          break;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  if (lastError) throw lastError;
  throw new XaiClientError("xAI completion failed unexpectedly");
}
