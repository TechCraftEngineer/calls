import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

let tracerProvider: NodeTracerProvider | null = null;

/**
 * Инициализация Langfuse tracing.
 * Используется дефолтный фильтр Langfuse — экспортируются только LLM-релевантные spans:
 * - известные LLM instrumentation scopes (openinference.*, langsmith, litellm и т.д.)
 * - spans с gen_ai.* атрибутами (AI SDK)
 * - spans от Langfuse SDK
 * HTTP, DB и прочие не-AI запросы не трассируются.
 */
export function initializeLangfuseTracing() {
  if (tracerProvider) return;

  const langfuseSpanProcessor = new LangfuseSpanProcessor();

  tracerProvider = new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  });

  tracerProvider.register();
}

export function shutdownTracing() {
  if (tracerProvider) {
    tracerProvider.shutdown().catch(console.error);
    tracerProvider = null;
  }
}
