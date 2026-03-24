import { z } from "zod";

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, "Название обязательно")
  .max(100, "Не более 100 символов");
