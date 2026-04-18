import { webhookRateLimitConfig } from "../config";
import { createRateLimit } from "./rate-limit";

// Rate limiting для webhook endpoints (защита от DoS)
export const webhookRateLimit = createRateLimit({
  windowMs: webhookRateLimitConfig.windowMs,
  maxRequests: webhookRateLimitConfig.maxRequests,
});
