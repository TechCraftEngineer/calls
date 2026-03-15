import { deleteCall } from "./delete";
import { evaluate } from "./evaluate";
import { generateRecommendationsHandler } from "./generate-recommendations-handler";
import { get } from "./get";
import { getPlaybackUrl } from "./get-playback-url";
import { list } from "./list";
import { transcribe } from "./transcribe";

export const callsRouter = {
  list,
  getPlaybackUrl,
  get,
  transcribe,
  evaluate,
  generateRecommendations: generateRecommendationsHandler,
  delete: deleteCall,
};
