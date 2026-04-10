/**
 * Идентификация спикеров через LLM
 */

import type { AsrExecutionLog } from "@calls/asr";
import { createLogger } from "../../../../logger";
import type { Call } from "../schemas";
import { identifySpeakers as identifyWithLlm } from "../speakers/identification";

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
  asrLogs: AsrExecutionLog[],
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
  const customerName = identifyResult.customerName;
  const operatorName = identifyResult.operatorName;

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
