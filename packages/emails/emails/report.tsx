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
  pixelBasedPreset,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export type ReportType = "daily" | "weekly" | "monthly";

interface ReportEmailProps {
  /** Текст отчёта (plain text, будет отображён с сохранением переносов) */
  reportText: string;
  /** Тип отчёта: daily | weekly | monthly */
  reportType: ReportType;
  /** Имя пользователя для приветствия */
  username?: string;
}

const reportTypeLabels = {
  daily: "Ежедневный отчёт",
  weekly: "Еженедельный отчёт",
  monthly: "Ежемесячный отчёт",
} as const satisfies Record<ReportType, string>;

export const ReportEmail = ({
  reportText = "Нет данных за период.",
  reportType = "daily",
  username,
}: ReportEmailProps) => {
  const typeLabel = reportTypeLabels[reportType] ?? "Отчёт по звонкам";
  const previewText = `${typeLabel} · ${APP_CONFIG.shortName}`;

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
          <Container className="mx-auto my-[40px] max-w-[600px] rounded border border-[#eaeaea] border-solid p-[24px]">
            <Heading className="mx-0 my-[24px] p-0 text-[20px] font-semibold text-black">
              {typeLabel}
            </Heading>

            <Text className="text-[14px] leading-[24px] text-black">
              {username ? <>Здравствуйте, {username}.</> : <>Здравствуйте.</>}
            </Text>

            <Section className="my-[24px] rounded bg-[#f9fafb] p-[16px] font-mono text-[13px] leading-[20px] text-black whitespace-pre-wrap">
              {reportText}
            </Section>

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />

            <Text className="text-[12px] leading-[24px] text-[#666666]">
              Это автоматическое письмо от{" "}
              <Link href={env.APP_URL} className="text-blue-600 no-underline">
                {APP_CONFIG.shortName}
              </Link>
              . Вы получаете его, потому что включили email-отчёты в настройках.
              Отписаться можно в разделе «Настройки отчётов».
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

Object.assign(ReportEmail, {
  PreviewProps: {
    reportText:
      "👤 Менеджер 1\n   Входящие: 5 (2 мин)\n   Исходящие: 3 (1 мин)\n\n───\nВсего: входящие 5, исходящие 3",
    reportType: "daily" as const,
    username: "Иван",
  } as ReportEmailProps,
});

export default ReportEmail;
