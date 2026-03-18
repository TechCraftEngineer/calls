"use client";

import { Badge } from "@calls/ui";

export function LinkStatus({
  linkedUser,
  linkedInvitation,
}: {
  linkedUser?: { email: string; name: string } | null;
  linkedInvitation?: { email: string; role: string } | null;
}) {
  if (linkedUser) {
    return <Badge>{linkedUser.name || linkedUser.email}</Badge>;
  }
  if (linkedInvitation) {
    return <Badge variant="secondary">{linkedInvitation.email}</Badge>;
  }
  return <Badge variant="outline">Не привязан</Badge>;
}
