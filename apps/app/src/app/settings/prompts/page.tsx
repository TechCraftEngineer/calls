"use client";

import { paths } from "@calls/config";
import { redirect } from "next/navigation";

export default function SettingsPromptsPage() {
  redirect(paths.settings.root);
}
