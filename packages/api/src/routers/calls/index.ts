import { deleteCall } from "./delete";
import { deleteManyCalls } from "./delete-many";
import { evaluate } from "./evaluate";
import { generateRecommendationsProcedure } from "./generate-recommendations";
import { get } from "./get";
import { getEnhancedPlaybackUrl } from "./get-enhanced-playback-url";
import { getPlaybackUrl } from "./get-playback-url";
import { importHistoricalCalls } from "./import-historical";
import { list } from "./list";
import { transcribe } from "./transcribe";

export const callsRouter = {
  list,
  getPlaybackUrl,
  getEnhancedPlaybackUrl,
  get,
  transcribe,
  evaluate,
  generateRecommendations: generateRecommendationsProcedure,
  delete: deleteCall,
  deleteMany: deleteManyCalls,
  importHistoricalCalls,
};
