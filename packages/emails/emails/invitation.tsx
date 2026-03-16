import { APP_CONFIG, env, paths } from "@calls/config";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { emailTailwindConfig } from "../tailwind";

export default function InvitationEmail({
  inviteLink = `${env.APP_URL}${paths.invite.byToken("abc123")}`,
  workspaceName = "Рабочее пространство",
  inviterName,
  role = "member",
  userExists = false,
}: {
  inviteLink?: string;
  workspaceName?: string;
  inviterName?: string;
  role?: "admin" | "member";
  userExists?: boolean;
}) {
  const roleLabel = role === "admin" ? "администратора" : "участника";

  return (
    <Html>
      <Head />
      <Preview>
        Вас приглашают в «{workspaceName}» · {APP_CONFIG.shortName}
      </Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body className="mx-auto my-auto bg-[#f8f9fb] font-sans">
          <Container className="mx-auto my-[40px] max-w-[600px] rounded-lg border border-solid border-[#e5e7eb] bg-white p-[32px] shadow-sm">
            <div className="mb-[24px] text-center">
              <div
                className="mx-auto mb-[16px] inline-flex h-[56px] w-[56px] items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600"
                role="img"
                aria-label="Иконка приглашения"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  aria-hidden
                >
                  <title>Иконка приглашения</title>
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
            </div>

            <Heading className="mx-0 mb-[16px] p-0 text-center text-[28px] font-bold text-[#111827]">
              Вас приглашают в рабочее пространство
            </Heading>

            <Text className="mb-[24px] text-center text-[16px] leading-[24px] text-[#6b7280]">
              {inviterName ? (
                <>
                  <strong>{inviterName}</strong> приглашает вас в рабочее
                  пространство «<strong>{workspaceName}</strong>» в качестве{" "}
                  {roleLabel}
                </>
              ) : (
                <>
                  Вас пригласили в рабочее пространство «
                  <strong>{workspaceName}</strong>» в качестве {roleLabel}
                </>
              )}
            </Text>

            <Section className="my-[32px] text-center">
              <Button
                className="rounded-lg bg-[#111827] px-[32px] py-[14px] text-center text-[15px] font-semibold text-white no-underline shadow-sm"
                href={inviteLink}
              >
                {userExists ? "Присоединиться" : "Принять приглашение"}
              </Button>
            </Section>

            <div className="my-[24px] rounded-lg border border-solid border-[#e5e7eb] bg-[#f9fafb] p-[16px]">
              <Text className="m-0 text-[13px] leading-[20px] text-[#6b7280]">
                <strong className="text-[#374151]">Как присоединиться</strong>
                <br />
                {userExists ? (
                  <>
                    Нажмите кнопку выше и войдите в свой аккаунт — доступ к
                    рабочему пространству откроется автоматически.
                  </>
                ) : (
                  <>
                    Нажмите кнопку выше, зарегистрируйтесь — и вы сразу получите
                    доступ к рабочему пространству.
                  </>
                )}{" "}
                Если кнопка не сработала, скопируйте ссылку ниже и вставьте её в
                адресную строку браузера.
              </Text>
            </div>

            <Text className="mb-[8px] text-[13px] leading-[20px] text-[#6b7280]">
              Резервная ссылка:
            </Text>
            <Link
              href={inviteLink}
              className="block break-all rounded bg-[#f3f4f6] px-[12px] py-[8px] text-[13px] text-[#2563eb] no-underline"
            >
              {inviteLink}
            </Link>

            <Text className="mt-[16px] text-[13px] leading-[20px] text-[#9ca3af]">
              ⏱ Срок действия ссылки — 7 дней
            </Text>

            <Hr className="mx-0 my-[32px] w-full border border-solid border-[#e5e7eb]" />

            <Text className="text-center text-[12px] leading-[20px] text-[#9ca3af]">
              Это автоматическое письмо от{" "}
              <Link href={env.APP_URL} className="text-[#9ca3af] no-underline">
                {APP_CONFIG.shortName}
              </Link>
              <br />
              Если вы не ожидали этого письма, просто проигнорируйте его.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
