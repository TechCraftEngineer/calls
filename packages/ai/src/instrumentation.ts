import { initializeLangfuseTracing } from "./otel";

// Initialize Langfuse tracing when the module is imported
initializeLangfuseTracing();

export async function register() {
  // This function is called by Next.js to register instrumentation
  // It's a no-op here since we initialize tracing on import
}
