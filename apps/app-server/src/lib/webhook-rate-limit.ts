import { createRateLimit } from "./rate-limit";

// Rate limiting для webhook endpoints (защита от DoS)
export const webhookRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 минута
  maxRequests: 30, // максимум 30 запросов в минуту на IP
});
