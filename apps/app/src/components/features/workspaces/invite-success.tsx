import { Button, Input } from "@calls/ui";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface InviteSuccessProps {
  email?: string;
  inviteUrl: string;
  isLinkInvite: boolean;
  onClose: () => void;
}

export default function InviteSuccess({
  email,
  inviteUrl,
  isLinkInvite,
  onClose,
}: InviteSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
            aria-hidden="true"
          >
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2
              id="invite-success-title"
              className="text-xl font-bold text-gray-900 m-0"
            >
              {isLinkInvite
                ? "Ссылка-приглашение создана"
                : "Приглашение отправлено"}
            </h2>
            <p className="text-sm text-gray-600 mt-1 m-0">
              {isLinkInvite ? (
                "Любой, у кого есть эта ссылка, сможет присоединиться"
              ) : (
                <>
                  Email отправлен на <strong>{email}</strong>
                </>
              )}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Закрыть"
          className="shrink-0"
        >
          ×
        </Button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <label
          htmlFor="invite-link"
          className="block text-xs font-semibold text-gray-700 mb-2"
        >
          Ссылка для приглашения
        </label>
        <div className="flex min-w-0 gap-2">
          <Input
            id="invite-link"
            type="text"
            value={inviteUrl}
            readOnly
            className="min-w-0 flex-1 font-mono text-sm text-gray-900 bg-white"
            onClick={(e) => e.currentTarget.select()}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyLink}
            className="shrink-0 min-w-[44px]"
            aria-label="Скопировать ссылку"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
