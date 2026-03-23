/**
 * Универсальная обёртка над generateText с базовыми настройками и Langfuse tracing.
 * Используйте вместо прямого вызова generateText из "ai".
 */

import { deepseek } from "@ai-sdk/deepseek";
import { openai } from "@ai-sdk/openai";
import { env } from "@calls/config";
import { openrouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { generateText as aiGenerateText } from "ai";

/** Провайдер AI: openai | openrouter | deepseek */
export type AiProvider = "openai" | "openrouter" | "deepseek";
export type AiModelProfile = "default" | "premium" | "longContext" | "cheap";

/** Опции для getAIModel */
export interface GetAIModelOptions {
  provider?: AiProvider;
  model?: string;
  profile?: AiModelProfile;
}

function normalizeModelId(modelId: string): string {
  const normalized = modelId.trim();
  const slashIndex = normalized.lastIndexOf("/");
  return slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
}

function resolveModelIdForProvider(
  modelId: string,
  provider: AiProvider,
): string {
  // OpenRouter expects provider-qualified IDs (e.g. "openai/gpt-5-nano").
  if (provider === "openrouter") {
    return modelId.trim();
  }

  return normalizeModelId(modelId);
}

export function getAIModelId(profile: AiModelProfile = "default"): string {
  const modelId =
    profile === "premium"
      ? env.AI_MODEL_PREMIUM || env.AI_MODEL
      : profile === "longContext"
        ? env.AI_MODEL_LONG_CONTEXT || env.AI_MODEL
        : profile === "cheap"
          ? env.AI_MODEL_CHEAP || env.AI_MODEL
          : env.AI_MODEL;

  return normalizeModelId(modelId);
}

function getRawAIModelId(profile: AiModelProfile = "default"): string {
  switch (profile) {
    case "premium":
      return env.AI_MODEL_PREMIUM || env.AI_MODEL;
    case "longContext":
      return env.AI_MODEL_LONG_CONTEXT || env.AI_MODEL;
    case "cheap":
      return env.AI_MODEL_CHEAP || env.AI_MODEL;
    default:
      return env.AI_MODEL;
  }
}

/**
 * Проверяет, настроен ли API ключ для текущего провайдера.
 */
export function hasAiProviderConfigured(): boolean {
  const provider = env.AI_PROVIDER;
  switch (provider) {
    case "openai":
      return !!env.OPENAI_API_KEY;
    case "openrouter":
      return !!env.OPENROUTER_API_KEY;
    case "deepseek":
      return !!env.DEEPSEEK_API_KEY;
    default:
      return false;
  }
}

/**
 * Возвращает модель для вызова AI на основе конфигурации.
 * Использует env: AI_PROVIDER, AI_MODEL. API ключи: OPENAI_API_KEY / OPENROUTER_API_KEY / DEEPSEEK_API_KEY.
 */
export function getAIModel(options: GetAIModelOptions = {}): LanguageModel {
  const provider = options.provider ?? env.AI_PROVIDER;
  const modelId = resolveModelIdForProvider(
    options.model ?? getRawAIModelId(options.profile),
    provider,
  );

  switch (provider) {
    case "openrouter":
      return openrouter(modelId);
    case "deepseek":
      return deepseek(modelId);
    default:
      return openai(modelId);
  }
}

/** Метаданные для Langfuse tracing */
export interface GenerateTelemetryMetadata {
  functionId?: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  langfuseTraceId?: string;
  [key: string]: unknown;
}

/** Базовые опции generateWithAi */
interface GenerateWithAiBaseOptions {
  /** Системный промпт */
  system?: string;
  /** Модель (переопределяет env.AI_MODEL) */
  model?: string;
  /** Провайдер (переопределяет env.AI_PROVIDER) */
  provider?: AiProvider;
  /** Профиль модели (default | premium | longContext | cheap) */
  modelProfile?: AiModelProfile;
  /** Температура (0–2) */
  temperature?: number;
  /** Макс. токенов на выход */
  maxOutputTokens?: number;
  /** Макс. повторов при ошибке */
  maxRetries?: number;
  /** Сигнал отмены */
  abortSignal?: AbortSignal;
  /** Таймаут в мс */
  timeout?: number;
  /** Идентификатор функции для Langfuse (имя span) */
  functionId?: string;
  /** Метаданные для Langfuse */
  metadata?: GenerateTelemetryMetadata;
  /** Включить Langfuse tracing (по умолчанию true) */
  langfuseTracing?: boolean;
}

/** Опции с prompt (текст) */
export interface GenerateWithAiPromptOptions extends GenerateWithAiBaseOptions {
  prompt: string;
  messages?: never;
}

/** Опции с messages */
export interface GenerateWithAiMessagesOptions
  extends GenerateWithAiBaseOptions {
  prompt?: never;
  messages: Parameters<typeof aiGenerateText>[0]["messages"];
}

/** Опции generateWithAi — prompt или messages обязательны */
export type GenerateWithAiOptions = (
  | GenerateWithAiPromptOptions
  | GenerateWithAiMessagesOptions
) &
  GenerateWithAiBaseOptions & {
    /** Структурированный вывод (Output.object), tools и др. — передаются в generateText */
    [key: string]: unknown;
  };

const DEFAULT_TELEMETRY = {
  isEnabled: true,
  recordInputs: true,
  recordOutputs: true,
};

/**
 * Универсальный вызов AI с базовыми настройками и Langfuse tracing.
 *
 * @example
 * ```ts
 * const { text } = await generateWithAi({
 *   system: "Ты помощник",
 *   prompt: "Привет!",
 *   functionId: "greeting",
 * });
 * ```
 *
 * @example Структурированный вывод
 * ```ts
 * import { Output } from "ai";
 * const { output } = await generateWithAi({
 *   system: "...",
 *   prompt: "...",
 *   output: Output.object({
 *     schema: z.object({ summary: z.string(), sentiment: z.string() }),
 *   }),
 *   functionId: "summarize",
 * });
 * ```
 */
export async function generateWithAi(
  options: GenerateWithAiOptions,
): ReturnType<typeof aiGenerateText> {
  const {
    model: modelOverride,
    modelProfile,
    provider,
    functionId = "generate-with-ai",
    metadata = {},
    langfuseTracing = true,
    ...rest
  } = options;

  const model = getAIModel({
    provider,
    model: modelOverride,
    profile: modelProfile,
  });

  const experimental_telemetry = langfuseTracing
    ? {
        ...DEFAULT_TELEMETRY,
        functionId,
        metadata: {
          provider: provider ?? env.AI_PROVIDER,
          model: normalizeModelId(
            modelOverride ?? getRawAIModelId(modelProfile),
          ),
          ...metadata,
        },
      }
    : undefined;

  const { prompt, messages, ...other } = rest;

  if (!prompt && !messages) {
    throw new Error("generateWithAi: требуется prompt или messages");
  }

  const promptOrMessages = prompt ? { prompt } : { messages: messages ?? [] };

  return aiGenerateText({
    ...other,
    ...promptOrMessages,
    model,
    experimental_telemetry,
  });
}
