/**
 * Идентификация спикеров через LLM
 */

import { createLogger } from "../../../../logger";
import { identifySpeakers as identifyWithLlm } from "../speaker-identification";
import type { Call } from "../schemas";

const logger = createLogger("transcribe-call:identify-speakers");

export interface IdentifyResult {
  text: string;
  customerName?: string;
  operatorName?: string;
  metadata: {
    success?: boolean;
    mapping?: Record<string, string>;
    usedEmbeddings?: boolean;
    clusterCount?: number;
    reason?: string;
    truncatedForAnalysis?: boolean;
    fallbackReason?: string;
    fallbackAttempted?: boolean;
    errorCode?: string;
    error?: string;
  };
}

export async function identifySpeakers(
  call: Call,
  normalizedText: string,
  asrLogs: Array<{
    provider: string;
    utterances?: unknown[];
    raw?: unknown;
  }>,
  managerNameFromPbx: string | null,
  summary?: string,
): Promise<IdentifyResult> {
  const identifyResult = await identifyWithLlm(
    {
      direction: call.direction || "unknown",
      name: call.name,
      workspaceId: call.workspaceId,
    },
    {
      normalizedText,
      metadata: { asrLogs },
    },
    managerNameFromPbx,
    summary,
  );

  const finalText = identifyResult.text || "";
  const customerName = (identifyResult as { customerName?: string }).customerName;
  const operatorName = (identifyResult as { operatorName?: string }).operatorName;

  const originalText = normalizedText || "";
  const debugData = {
    callId: call.id,
    finalTextLength: finalText.length,
    originalTextLength: originalText.length,
    customerName,
    operatorName,
    identificationSuccess: identifyResult.metadata?.success || false,
    speakerMapping: identifyResult.metadata?.mapping || {},
    usedEmbeddings: identifyResult.metadata?.usedEmbeddings || false,
    clusterCount: identifyResult.metadata?.clusterCount || 0,
    identificationReason: identifyResult.metadata?.reason,
  };

  if (identifyResult.metadata?.fallbackAttempted) {
    logger.warn("LLM идентификация спикеров использовала фоллбек", debugData);
  } else {
    logger.info("Speaker identification results", debugData);
  }

  return {
    text: finalText,
    customerName,
    operatorName,
    metadata: identifyResult.metadata || {},
  };
}
