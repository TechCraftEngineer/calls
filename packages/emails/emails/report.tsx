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
  Row,
  Section,
  Tailwind,
  Text,
  Column,
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

            <Section className="my-[24px]">
              <Heading className="mx-0 my-[16px] p-0 text-[16px] font-semibold text-black">
                📈 KPI сотрудников
              </Heading>
              
              {/* Таблица с KPI */}
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Менеджер</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Звонки</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Минуты</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Оценка</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm">Иванов И.И.</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">25</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">180</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">4.2</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">15,000 ₽</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-sm">Петров П.П.</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">18</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">142</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">3.8</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">12,500 ₽</td>
                  </tr>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="border border-gray-300 px-3 py-2 text-sm">Итого:</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">43</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">322</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">4.0</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">13,750 ₽</td>
                  </tr>
                </tbody>
              </table>
            </Section>

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
      "� **Итоги по всем сотрудникам:**\n• Всего звонков: 43\n• Всего минут: 322\n• Оценено: 35 из 43 звонков\n• Средняя оценка качества: 4.0 ⭐\n• Средняя сумма сделки: 13,750 ₽",
    reportType: "daily" as const,
    username: "Иван",
  } as ReportEmailProps,
});

export default ReportEmail;
