import { APP_CONFIG, env } from "@calls/config";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";

import { emailTailwindConfig } from "../tailwind";

export default function OtpSignInEmail({
  otp = "123456",
  isSignUp = false,
}: {
  otp: string;
  isSignUp?: boolean;
}) {
  const action = isSignUp ? "регистрации" : "входа";

  return (
    <Html>
      <Head />
      <Preview>{`Код подтверждения для ${action} — ${APP_CONFIG.shortName}`}</Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              {isSignUp ? "Регистрация" : "Вход"} в{" "}
              <Link href={env.APP_URL} className="text-black">
                <strong>{APP_CONFIG.shortName}</strong>
              </Link>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">
              Здравствуйте,
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Ваш одноразовый код для {action}:
            </Text>
            <Text className="my-[20px] text-center text-[24px] font-bold">
              {otp}
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Введите этот код для завершения {action}. Код действителен 10
              минут.
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Если вы не запрашивали этот код, проигнорируйте это письмо.
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
