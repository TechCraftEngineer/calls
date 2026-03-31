import { APP_CONFIG, env } from "@calls/config";
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

interface WelcomeEmailProps {
  /** Имя для приветствия (или email, если имя недоступно) */
  username?: string;
  /** Email получателя — для футера «письмо отправлено на» */
  email?: string;
}

export const WelcomeEmail = ({ username = "пользователь", email }: WelcomeEmailProps) => {
  const previewText = `Добро пожаловать в ${APP_CONFIG.shortName}`;

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
              Добро пожаловать в{" "}
              <Link href={env.APP_URL} className="text-black">
                <strong>{APP_CONFIG.shortName}</strong>
              </Link>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">Здравствуйте, {username},</Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Рады приветствовать вас в {APP_CONFIG.shortName}! Ваш аккаунт успешно создан на{" "}
              <Link href={env.APP_URL} className="text-black">
                <strong>{env.APP_URL.replace(/^https?:\/\//, "")}</strong>
              </Link>
              .
            </Text>
            <Section className="mb-[32px] mt-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center text-[14px] font-semibold text-white no-underline"
                href={env.APP_URL}
              >
                Начать работу
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-black">
              Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:{" "}
              <Link href={env.APP_URL} className="text-blue-600 no-underline">
                {env.APP_URL}
              </Link>
            </Text>
            {email && (
              <>
                <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
                <Text className="text-[12px] leading-[24px] text-[#666666]">
                  Это письмо отправлено на адрес <span className="text-black">{email}</span>. Если
                  вы не регистрировались в {APP_CONFIG.shortName}, проигнорируйте это письмо или
                  обратитесь в службу поддержки.
                </Text>
              </>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

Object.assign(WelcomeEmail, {
  PreviewProps: {
    username: "Иван",
    email: "ivan@example.com",
  } as WelcomeEmailProps,
});

export default WelcomeEmail;
