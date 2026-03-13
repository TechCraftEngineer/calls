/**
 * Prompts service - handles business logic for prompt operations
 */

import type { PromptsRepository } from "../repositories/prompts.repository";
import type { SystemRepository } from "../repositories/system.repository";

export class PromptsService {
  constructor(
    private promptsRepository: PromptsRepository,
    private systemRepository: SystemRepository,
  ) {}

  async getPrompt(key: string, defaultValue?: string): Promise<string | null> {
    return this.promptsRepository.findByKeyWithDefault(key, defaultValue);
  }

  async getAllPrompts(): Promise<
    {
      key: string;
      value: string;
      description: string | null;
      updated_at: string | null;
    }[]
  > {
    return this.promptsRepository.findAll();
  }

  async updatePrompt(
    key: string,
    value: string,
    description?: string | null,
  ): Promise<boolean> {
    const result = await this.promptsRepository.upsert(key, value, description);

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `Prompt ${key} updated`,
        "admin",
      );
    }

    return result;
  }
}
