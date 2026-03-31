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

export interface ManagerStats {
  name: string;
  internalNumber: string | null;
  incoming: { count: number; duration: number; totalDuration?: number };
  outgoing: { count: number; duration: number; totalDuration?: number };
  avgManagerScore?: number | null;
  evaluatedCount?: number;
  // KPI данные
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  kpiActualTalkTimeMinutes?: number;
  kpiCompletionPercentage?: number;
  kpiCalculatedBonus?: number;
  kpiTotalSalary?: number;
}

export interface ReportEmailProps {
  /** Тип отчёта: daily | weekly | monthly */
  reportType: ReportType;
  /** Имя пользователя для приветствия */
  username?: string;
  /** Статистика по менеджерам для таблицы KPI */
  stats?: Record<string, ManagerStats>;
  /** Включать KPI данные в отчет */
  includeKpi?: boolean;
  /** Показывать средний рейтинг менеджеров */
  avgManagerScore?: boolean;
  /** Детальный отчет */
  reportDetailed?: boolean;
  /** Включать сводки по звонкам */
  reportIncludeCallSummaries?: boolean;
}

const reportTypeLabels = {
  daily: "Ежедневный отчёт",
  weekly: "Еженедельный отчёт",
  monthly: "Ежемесячный отчёт",
} as const satisfies Record<ReportType, string>;

function _formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0";
  const minutes = Math.round(seconds / 60);
  return minutes.toString();
}

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

function formatScore(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

interface PreparedStats {
  id: string;
  name: string;
  incomingCount: number;
  outgoingCount: number;
  totalCount: number;
  incomingAvgDurationSec: number;
  outgoingAvgDurationSec: number;
  avgManagerScore?: number | null;
  evaluatedCount: number;
  // KPI данные
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
  kpiActualTalkTimeMinutes?: number;
  kpiCompletionPercentage?: number;
  kpiCalculatedBonus?: number;
  kpiTotalSalary?: number;
}

function prepareStats(entries: [string, ManagerStats][]): {
  managers: PreparedStats[];
  totals: {
    incomingCount: number;
    outgoingCount: number;
    totalCount: number;
    incomingTotalDurationSec: number;
    outgoingTotalDurationSec: number;
    evaluatedCount: number;
    // KPI итоги
    totalBaseSalary: number;
    totalTargetBonus: number;
    totalCalculatedBonus: number;
    totalSalary: number;
  };
} {
  const managers: PreparedStats[] = [];
  let incomingCount = 0;
  let outgoingCount = 0;
  let incomingTotalDurationSec = 0;
  let outgoingTotalDurationSec = 0;
  let evaluatedCount = 0;
  // KPI итоги
  let totalBaseSalary = 0;
  let totalTargetBonus = 0;
  let totalCalculatedBonus = 0;
  let totalSalary = 0;

  for (const [name, raw] of entries) {
    if (!raw || typeof raw !== "object") continue;
    const inCount = raw.incoming?.count ?? 0;
    const outCount = raw.outgoing?.count ?? 0;
    const inTotalSec =
      raw.incoming?.totalDuration ?? (raw.incoming?.duration ?? 0) * inCount;
    const outTotalSec =
      raw.outgoing?.totalDuration ?? (raw.outgoing?.duration ?? 0) * outCount;
    const inAvgSec = inCount > 0 ? inTotalSec / inCount : 0;
    const outAvgSec = outCount > 0 ? outTotalSec / outCount : 0;
    const total = inCount + outCount;
    const evalCount = raw.evaluatedCount ?? 0;

    incomingCount += inCount;
    outgoingCount += outCount;
    incomingTotalDurationSec += inTotalSec;
    outgoingTotalDurationSec += outTotalSec;
    evaluatedCount += evalCount;
    
    // KPI итоги
    totalBaseSalary += raw.kpiBaseSalary ?? 0;
    totalTargetBonus += raw.kpiTargetBonus ?? 0;
    totalCalculatedBonus += raw.kpiCalculatedBonus ?? 0;
    totalSalary += raw.kpiTotalSalary ?? 0;

    managers.push({
      id: name, // Используем имя как уникальный идентификатор
      name,
      incomingCount: inCount,
      outgoingCount: outCount,
      totalCount: total,
      incomingAvgDurationSec: inAvgSec,
      outgoingAvgDurationSec: outAvgSec,
      avgManagerScore: raw.avgManagerScore,
      evaluatedCount: evalCount,
      // KPI данные
      kpiBaseSalary: raw.kpiBaseSalary,
      kpiTargetBonus: raw.kpiTargetBonus,
      kpiTargetTalkTimeMinutes: raw.kpiTargetTalkTimeMinutes,
      kpiActualTalkTimeMinutes: raw.kpiActualTalkTimeMinutes,
      kpiCompletionPercentage: raw.kpiCompletionPercentage,
      kpiCalculatedBonus: raw.kpiCalculatedBonus,
      kpiTotalSalary: raw.kpiTotalSalary,
    });
  }

  managers.sort(
    (a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name),
  );

  return {
    managers,
    totals: {
      incomingCount,
      outgoingCount,
      totalCount: incomingCount + outgoingCount,
      incomingTotalDurationSec,
      outgoingTotalDurationSec,
      evaluatedCount,
      // KPI итоги
      totalBaseSalary,
      totalTargetBonus,
      totalCalculatedBonus,
      totalSalary,
    },
  };
}

export const ReportEmail = ({
  reportType = "daily",
  username,
  stats,
  includeKpi = false,
  avgManagerScore = false,
  reportDetailed = false,
  reportIncludeCallSummaries = false,
}: ReportEmailProps) => {
  const typeLabel = reportTypeLabels[reportType] ?? "Отчёт по звонкам";
  const previewText = `${typeLabel} · ${APP_CONFIG.shortName}`;

  // Подготовка данных для таблицы KPI
  const kpiTable = stats ? (() => {
    const entries = Object.entries(stats);
    if (entries.length === 0) return null;

    const { managers, totals } = prepareStats(entries);
    
    // Вычисление средних значений
    let scoreWeightedSum = 0;
    let scoreWeight = 0;

    for (const item of managers) {
      const weight = item.evaluatedCount ?? 0;
      if (weight <= 0) continue;
      if (typeof item.avgManagerScore === "number") {
        scoreWeightedSum += item.avgManagerScore * weight;
        scoreWeight += weight;
      }
    }

    const overallAvgManagerScore = scoreWeight > 0 ? scoreWeightedSum / scoreWeight : null;

    return {
      managers,
      totals,
      overallAvgManagerScore,
    };
  })() : null;

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
              
              {kpiTable ? (
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Менеджер</th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Звонки</th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Минуты</th>
                      {avgManagerScore && (
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Рейтинг</th>
                      )}
                      {includeKpi && (
                        <>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Оклад</th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Бонус</th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">% выполнения</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {kpiTable.managers.map((manager, index) => {
                      const totalMinutes = Math.round(
                        (manager.incomingAvgDurationSec * manager.incomingCount + manager.outgoingAvgDurationSec * manager.outgoingCount) / 60
                      );
                      
                      return (
                        <tr key={manager.id}>
                          <td className="border border-gray-300 px-3 py-2 text-sm">{manager.name}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center">{manager.totalCount}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center">{totalMinutes}</td>
                          {avgManagerScore && (
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center">{formatScore(manager.avgManagerScore)}</td>
                          )}
                          {includeKpi && (
                            <>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center">{formatValue(manager.kpiBaseSalary ?? 0)} ₽</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center">{formatValue(manager.kpiCalculatedBonus ?? 0)} ₽</td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center">{manager.kpiCompletionPercentage ?? 0}%</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="border border-gray-300 px-3 py-2 text-sm">Итого:</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-center">{kpiTable.totals.totalCount}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-center">
                        {Math.round((kpiTable.totals.incomingTotalDurationSec + kpiTable.totals.outgoingTotalDurationSec) / 60)}
                      </td>
                      {avgManagerScore && (
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center">-</td>
                      )}
                      {includeKpi && (
                        <>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center">{formatValue(kpiTable.totals.totalBaseSalary)} ₽</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center">{formatValue(kpiTable.totals.totalCalculatedBonus)} ₽</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center">-</td>
                        </>
                      )}
                    </tr>
                  </tbody>
                </table>
              ) : (
                <Text className="text-[14px] text-gray-600">
                  Нет данных для отображения KPI
                </Text>
              )}
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
    reportType: "daily" as const,
    username: "Иван",
    stats: {},
  } as ReportEmailProps,
});

export default ReportEmail;
