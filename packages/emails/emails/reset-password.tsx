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
  pixelBasedPreset,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface ResetPasswordEmailProps {
  resetLink?: string;
}

export const ResetPasswordEmail = ({
  resetLink = `${env.APP_URL}${paths.auth.resetPassword}?token=abc123`,
}: ResetPasswordEmailProps) => {
  const previewText = `Сброс пароля — ${APP_CONFIG.shortName}`;

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
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Сброс пароля для{" "}
              <Link href={env.APP_URL} className="text-black">
                <strong>{APP_CONFIG.shortName}</strong>
              </Link>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">Здравствуйте,</Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Мы получили запрос на сброс пароля. Нажмите кнопку ниже, чтобы создать новый пароль:
            </Text>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={resetLink}
              >
                Сбросить пароль
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-black">
              Или скопируйте и вставьте эту ссылку в браузер:{" "}
              <Link href={resetLink} className="text-blue-600 no-underline">
                {resetLink}
              </Link>
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Ссылка действительна 1 час по соображениям безопасности.
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Если вы не запрашивали сброс пароля, проигнорируйте это письмо или обратитесь в
              поддержку.
            </Text>
            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              Это автоматическое сообщение от {APP_CONFIG.shortName}. Пожалуйста, не отвечайте на
              это письмо.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

Object.assign(ResetPasswordEmail, {
  PreviewProps: {
    resetLink: `${env.APP_URL}${paths.auth.resetPassword}?token=abc123`,
  } as ResetPasswordEmailProps,
});

export default ResetPasswordEmail;
