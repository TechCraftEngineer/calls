import type { ShouldExportSpan } from "@langfuse/otel";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

let tracerProvider: NodeTracerProvider | null = null;

export function initializeLangfuseTracing() {
  if (tracerProvider) return;

  const shouldExportSpan: ShouldExportSpan = (span) => {
    return span.otelSpan.instrumentationScope.name !== "next.js";
  };

  const langfuseSpanProcessor = new LangfuseSpanProcessor({
    shouldExportSpan,
  });

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
