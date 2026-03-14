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

  async getPrompt(
    key: string,
    workspaceId: string,
    defaultValue?: string,
  ): Promise<string | null> {
    return this.promptsRepository.findByKeyWithDefault(
      key,
      workspaceId,
      defaultValue,
    );
  }

  async getAllPrompts(workspaceId: string): Promise<
    {
      key: string;
      value: string;
      description: string | null;
      updatedAt: Date | null;
    }[]
  > {
    return this.promptsRepository.findAll(workspaceId);
  }

  async updatePrompt(
    key: string,
    value: string,
    description: string | null,
    workspaceId: string,
  ): Promise<boolean> {
    const result = await this.promptsRepository.upsert(
      key,
      value,
      description,
      workspaceId,
    );

    if (result) {
      await this.systemRepository.addActivityLog(
        "INFO",
        `Prompt ${key} updated`,
        "admin",
        workspaceId,
      );
    }

    return result;
  }
}
