import {
  Button,
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  Input,
  RadioGroup,
  RadioGroupItem,
} from "@calls/ui";
import { useState } from "react";
import { z } from "zod";

interface InviteFormProps {
  onSubmit: (email: string, role: "admin" | "member") => void;
  onCreateLink: (role: "admin" | "member") => void;
  onClose: () => void;
  isLoading: boolean;
}

const emailSchema = z
  .string()
  .min(1, "Email обязателен")
  .email("Неверный формат email");

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  member: "Участник",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Может управлять участниками и настройками компании",
  member: "Может просматривать и работать с контентом",
};

export default function InviteForm({
  onSubmit,
  onCreateLink,
  onClose,
  isLoading,
}: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [inviteType, setInviteType] = useState<"email" | "link">("email");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (inviteType === "email" && email.trim()) {
      onSubmit(email.trim(), role);
    } else if (inviteType === "link") {
      onCreateLink(role);
    }
  };

  const isEmailValid = emailSchema.safeParse(email.trim()).success;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="space-y-4">
        <Field>
          <FieldLabel asChild>
            <legend className="text-sm font-medium text-gray-900">
              Тип приглашения
            </legend>
          </FieldLabel>
          <RadioGroup
            value={inviteType}
            onValueChange={(value: "email" | "link") => setInviteType(value)}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="email" id="invite-email" />
              <FieldContent>
                <FieldLabel htmlFor="invite-email" className="font-normal">
                  Пригласить по email
                </FieldLabel>
                <FieldDescription>
                  Отправить приглашение на конкретный email адрес
                </FieldDescription>
              </FieldContent>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="link" id="invite-link" />
              <FieldContent>
                <FieldLabel htmlFor="invite-link" className="font-normal">
                  Создать ссылку-приглашение
                </FieldLabel>
                <FieldDescription>
                  Любой человек со ссылкой сможет присоединиться
                </FieldDescription>
              </FieldContent>
            </div>
          </RadioGroup>
        </Field>

        {inviteType === "email" && (
          <Field>
            <FieldLabel htmlFor="email">Email адрес</FieldLabel>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={isLoading}
            />
          </Field>
        )}

        <Field>
          <FieldLabel asChild>
            <legend className="text-sm font-medium text-gray-900">
              Роль в компании
            </legend>
          </FieldLabel>
          <RadioGroup
            value={role}
            onValueChange={(value: "admin" | "member") => setRole(value)}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="member" id="role-member" />
              <FieldContent>
                <FieldLabel htmlFor="role-member" className="font-normal">
                  {ROLE_LABELS.member}
                </FieldLabel>
                <FieldDescription>{ROLE_DESCRIPTIONS.member}</FieldDescription>
              </FieldContent>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="admin" id="role-admin" />
              <FieldContent>
                <FieldLabel htmlFor="role-admin" className="font-normal">
                  {ROLE_LABELS.admin}
                </FieldLabel>
                <FieldDescription>{ROLE_DESCRIPTIONS.admin}</FieldDescription>
              </FieldContent>
            </div>
          </RadioGroup>
        </Field>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEmail("");
            setRole("member");
            setInviteType("email");
            onClose();
          }}
          disabled={isLoading}
          className="flex-1"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          disabled={isLoading || (inviteType === "email" && !isEmailValid)}
          className="flex-1"
        >
          {isLoading
            ? "Создание…"
            : inviteType === "email"
              ? "Отправить приглашение"
              : "Создать ссылку"}
        </Button>
      </div>
    </form>
  );
}
