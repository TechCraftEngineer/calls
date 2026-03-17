"use client";

import { Button } from "@calls/ui";

interface SettingsPageShellProps {
  children: React.ReactNode;
}

export default function SettingsPageShell({
  children,
}: SettingsPageShellProps) {
  return <div className="space-y-8">{children}</div>;
}

interface FooterProps {
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function Footer({ onSave, onCancel, saving }: FooterProps) {
  return (
    <div className="sticky bottom-0 -mb-8 mt-8 flex items-center justify-between gap-4 border-t border-border/60 bg-background/95 px-6 py-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <p className="text-sm text-muted-foreground">
        Выполните изменения и нажмите кнопку сохранения для применения настроек.
      </p>
      <div className="flex gap-3">
        <Button variant="link" onClick={onCancel} className="text-primary">
          Отмена
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
}

SettingsPageShell.Footer = Footer;
