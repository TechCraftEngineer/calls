import { APP_CONFIG, env, paths } from "@calls/config";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  pixelBasedPreset,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface InvitationEmailProps {
  inviteLink?: string;
  workspaceName?: string;
  inviterName?: string;
  role?: "admin" | "member";
  userExists?: boolean;
}

export const InvitationEmail = ({
  inviteLink = `${env.APP_URL}${paths.invite.byToken("abc123")}`,
  workspaceName = "Рабочее пространство",
  inviterName,
  role = "member",
  userExists = false,
}: InvitationEmailProps) => {
  const roleLabel = role === "admin" ? "администратора" : "участника";
  const previewText = `Вас приглашают в «${workspaceName}» · ${APP_CONFIG.shortName}`;

  return (
    <Html>
      <Head />
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">
              Вас приглашают в рабочее пространство
            </Heading>

            <Text className="text-[14px] leading-[24px] text-black">
              {inviterName ? (
                <>
                  <strong>{inviterName}</strong> приглашает вас в рабочее
                  пространство «<strong>{workspaceName}</strong>» в качестве{" "}
                  {roleLabel}.
                </>
              ) : (
                <>
                  Вас пригласили в рабочее пространство «
                  <strong>{workspaceName}</strong>» в качестве {roleLabel}.
                </>
              )}
            </Text>

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={inviteLink}
              >
                {userExists ? "Присоединиться" : "Принять приглашение"}
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-black">
              Или скопируйте и вставьте эту ссылку в браузер:{" "}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>

            <Text className="text-[14px] leading-[24px] text-black">
              Срок действия ссылки — 7 дней.
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Text className="text-[12px] leading-[24px] text-[#666666]">
              Это автоматическое письмо от{" "}
              <Link href={env.APP_URL} className="text-blue-600 no-underline">
                {APP_CONFIG.shortName}
              </Link>
              . Если вы не ожидали этого письма, просто проигнорируйте его.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

Object.assign(InvitationEmail, {
  PreviewProps: {
    inviteLink: `${env.APP_URL}${paths.invite.byToken("abc123")}`,
    workspaceName: "Рабочее пространство",
    inviterName: "Иван Иванов",
    role: "member" as const,
    userExists: false,
  } as InvitationEmailProps,
});

export default InvitationEmail;
