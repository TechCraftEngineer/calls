"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@calls/ui";

export function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 px-5 py-3.5">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}
