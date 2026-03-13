import { env } from "@calls/config";
import { Langfuse } from "langfuse";

let langfuseInstance: Langfuse | null = null;

export function getLangfuse(): Langfuse | null {
  if (!env.LANGFUSE_SECRET_KEY || !env.LANGFUSE_PUBLIC_KEY) {
    return null;
  }

  if (!langfuseInstance) {
    langfuseInstance = new Langfuse({
      secretKey: env.LANGFUSE_SECRET_KEY,
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      baseUrl: env.LANGFUSE_BASEURL,
    });
  }

  return langfuseInstance;
}

export function createTrace(name: string, userId?: string) {
  const langfuse = getLangfuse();
  if (!langfuse) return null;

  return langfuse.trace({
    name,
    userId,
    input: {},
  });
}

export function logChatEvent(
  traceId: string,
  eventName: string,
  data: Record<string, unknown>,
) {
  const langfuse = getLangfuse();
  if (!langfuse) return;

  langfuse
    .trace({
      id: traceId,
    })
    .event({
      name: eventName,
      input: data,
    });
}
