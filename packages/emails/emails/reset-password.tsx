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

export default function ResetPasswordEmail({
  resetLink = `${env.APP_URL}${paths.auth.resetPassword}?token=abc123`,
}: {
  resetLink?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Сброс пароля — {APP_CONFIG.shortName}</Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Сброс пароля для{" "}
              <Link href={env.APP_URL} className="text-black">
                <strong>{APP_CONFIG.shortName}</strong>
              </Link>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">
              Здравствуйте,
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Мы получили запрос на сброс пароля. Нажмите кнопку ниже, чтобы
              создать новый пароль:
            </Text>
            <Section className="my-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-[20px] py-[12px] text-center text-[14px] font-semibold text-white no-underline"
                href={resetLink}
              >
                Сбросить пароль
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-black">
              Или скопируйте и вставьте эту ссылку в браузер:
            </Text>
            <Link
              href={resetLink}
              className="text-[14px] text-blue-600 no-underline"
            >
              {resetLink}
            </Link>
            <Text className="text-[14px] leading-[24px] text-black">
              Ссылка действительна 1 час по соображениям безопасности.
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Если вы не запрашивали сброс пароля, проигнорируйте это письмо или
              обратитесь в поддержку.
            </Text>
            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              Это автоматическое сообщение от {APP_CONFIG.shortName}.
              Пожалуйста, не отвечайте на это письмо.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
