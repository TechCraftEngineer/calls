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
  kpiActualPerformanceRubles?: number; // Факт выполнения в рублях
}

export interface ReportEmailProps {
  /** Тип отчёта */
  reportType: ReportType;
  /** Имя пользователя для приветствия */
  username?: string;
  /** Статистика по менеджерам для таблицы KPI */
  stats?: Record<string, ManagerStats>;
  /** Включать KPI данные в отчет */
  includeKpi?: boolean;
  /** Показывать средний рейтинг менеджеров */
  avgManagerScore?: boolean;
  /** Дата начала периода */
  dateFrom?: Date;
  /** Дата конца периода */
  dateTo?: Date;
  /** Является ли отчет менеджерским (для отображения низких оценок) */
  isManagerReport?: boolean;
  /** Звонки с низкой оценкой по менеджерам (оценка < 3) */
  lowRatedCalls?: Record<string, number>;
  /** Название workspace */
  workspaceName?: string;
}

const reportTypeLabels = {
  daily: "Ежедневный отчёт",
  weekly: "Еженедельный отчёт",
  monthly: "Ежемесячный отчёт",
} as const satisfies Record<ReportType, string>;

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

function formatScore(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function pluralizeCalls(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "звонок";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "звонка";
  return "звонков";
}


interface PreparedStats {
  id: string;
  name: string;
  incomingCount: number;
  outgoingCount: number;
  totalCount: number;
  incomingAvgDurationSec: number;
  outgoingAvgDurationSec: number;
  incomingTotalDurationSec: number;
  outgoingTotalDurationSec: number;
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
  kpiActualPerformanceRubles?: number; // Факт выполнения в рублях
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
    totalBaseSalary: number;
    totalTargetBonus: number;
    totalCalculatedBonus: number;
    totalSalary: number;
    totalActualPerformanceRubles: number;
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
  let totalActualPerformanceRubles = 0;


  for (const [name, raw] of entries) {
    if (!raw || typeof raw !== "object") continue;
    
    const inCount = raw.incoming?.count ?? 0;
    const outCount = raw.outgoing?.count ?? 0;
    const inTotalSec = raw.incoming?.totalDuration ?? (raw.incoming?.duration ?? 0) * inCount;
    const outTotalSec = raw.outgoing?.totalDuration ?? (raw.outgoing?.duration ?? 0) * outCount;
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
    totalActualPerformanceRubles += raw.kpiActualPerformanceRubles ?? 0;

    managers.push({
      id: name, // Используем имя как уникальный идентификатор
      name,
      incomingCount: inCount,
      outgoingCount: outCount,
      totalCount: total,
      incomingAvgDurationSec: inAvgSec,
      outgoingAvgDurationSec: outAvgSec,
      incomingTotalDurationSec: inTotalSec,
      outgoingTotalDurationSec: outTotalSec,
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
      kpiActualPerformanceRubles: raw.kpiActualPerformanceRubles,
    });
  }

  managers.sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name));

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
      totalActualPerformanceRubles,
    },
  };
}

export const ReportEmail = ({
  reportType = "daily",
  username,
  stats,
  includeKpi = false,
  avgManagerScore = false,
  dateFrom,
  dateTo,
  isManagerReport = false,
  lowRatedCalls = {},
  workspaceName,
}: ReportEmailProps) => {
  const typeLabel = reportTypeLabels[reportType] ?? "Отчёт по звонкам";
  
  // Форматируем даты периода
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: "Europe/Moscow"
    });
  };
  
  let periodText = '';
  if (dateFrom && dateTo) {
    if (formatDate(dateFrom) === formatDate(dateTo)) {
      periodText = ` за ${formatDate(dateFrom)}`;
    } else {
      periodText = ` за ${formatDate(dateFrom)} — ${formatDate(dateTo)}`;
    }
  }
  
  const title = `${typeLabel}${periodText}`;
  const previewText = `${title} · ${APP_CONFIG.shortName}`;

  // Подготовка данных для таблицы KPI
  const kpiTable = stats
    ? (() => {
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
      })()
    : null;

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
          <Container className="mx-auto my-[40px] max-w-[900px] rounded border border-[#eaeaea] border-solid p-[24px]">
            <Heading className="mx-0 my-[24px] p-0 text-[20px] font-semibold text-black">
              {title}
            </Heading>

            {workspaceName && (
              <Text className="text-[14px] leading-[24px] text-gray-600 mb-[16px]">
                🏢 {workspaceName}
              </Text>
            )}

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
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold" rowSpan={2}>
                        Менеджер
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" colSpan={3}>
                        Звонки, шт.
                      </th>
                      {includeKpi && (
                        <>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" rowSpan={2}>
                            План, мин.
                          </th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" colSpan={3}>
                            Факт, мин.
                          </th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" rowSpan={2}>
                            % выполнения
                          </th>
                        </>
                      )}
                      {avgManagerScore && (
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" rowSpan={2}>
                          Рейтинг
                        </th>
                      )}
                      {includeKpi && reportType === "monthly" && (
                        <>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" rowSpan={2}>
                            Оклад, ₽
                          </th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" rowSpan={2}>
                            Бонус, ₽
                          </th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" rowSpan={2}>
                            Итого, ₽
                          </th>
                        </>
                      )}
                      {includeKpi && reportType === "weekly" && (
                        <>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" rowSpan={2}>
                            Бонус, ₽
                          </th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" rowSpan={2}>
                            Итого, ₽
                          </th>
                        </>
                      )}
                      {includeKpi && reportType === "daily" && (
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold" rowSpan={2}>
                          Бонус, ₽
                        </th>
                      )}
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                        Вх.
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                        Исх.
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                        Всего
                      </th>
                      {includeKpi && (
                        <>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                            Вх.
                          </th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                            Исх.
                          </th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">
                            Всего
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {kpiTable.managers.map((manager) => {
                      return (
                        <tr key={manager.id}>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {manager.name}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {manager.incomingCount}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {manager.outgoingCount}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {manager.totalCount}
                          </td>
                          {includeKpi && (
                            <>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                                {formatValue(manager.kpiTargetTalkTimeMinutes ?? 0)}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                                {formatValue(Math.round(manager.incomingTotalDurationSec / 60))}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                                {formatValue(Math.round(manager.outgoingTotalDurationSec / 60))}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                                {formatValue(manager.kpiActualTalkTimeMinutes ?? 0)}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                                {manager.kpiCompletionPercentage ?? 0}%
                              </td>
                            </>
                          )}
                          {avgManagerScore && (
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                              {formatScore(manager.avgManagerScore)}
                            </td>
                          )}
                          {includeKpi && reportType === "monthly" && (
                            <>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                                {formatValue(manager.kpiBaseSalary ?? 0)}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                                {formatValue(manager.kpiCalculatedBonus ?? 0)}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                                {formatValue(manager.kpiTotalSalary ?? 0)}
                              </td>
                            </>
                          )}
                          {includeKpi && reportType === "weekly" && (
                            <>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                                {formatValue(manager.kpiCalculatedBonus ?? 0)}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                                {formatValue(manager.kpiTotalSalary ?? 0)}
                              </td>
                            </>
                          )}
                          {includeKpi && reportType === "daily" && (
                            <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                              {formatValue(manager.kpiCalculatedBonus ?? 0)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="border border-gray-300 px-3 py-2 text-sm">Итого:</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                        {kpiTable.totals.incomingCount}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                        {kpiTable.totals.outgoingCount}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                        {kpiTable.totals.totalCount}
                      </td>
                      {includeKpi && (
                        <>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            -
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {formatValue(Math.round(kpiTable.totals.incomingTotalDurationSec / 60))}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {formatValue(Math.round(kpiTable.totals.outgoingTotalDurationSec / 60))}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {formatValue(Math.round((kpiTable.totals.incomingTotalDurationSec + kpiTable.totals.outgoingTotalDurationSec) / 60))}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            -
                          </td>
                        </>
                      )}
                      {avgManagerScore && (
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                          {formatScore(kpiTable.overallAvgManagerScore)}
                        </td>
                      )}
                      {includeKpi && reportType === "monthly" && (
                        <>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {formatValue(kpiTable.totals.totalBaseSalary)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {formatValue(kpiTable.totals.totalCalculatedBonus)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {formatValue(kpiTable.totals.totalSalary)}
                          </td>
                        </>
                      )}
                      {includeKpi && reportType === "weekly" && (
                        <>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {formatValue(kpiTable.totals.totalCalculatedBonus)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                            {formatValue(kpiTable.totals.totalSalary)}
                          </td>
                        </>
                      )}
                      {includeKpi && reportType === "daily" && (
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center whitespace-nowrap">
                          {formatValue(kpiTable.totals.totalCalculatedBonus)}
                        </td>
                      )}
                    </tr>
                                      </tbody>
                </table>
              ) : (
                <Text className="text-[14px] text-gray-600">Нет данных для отображения KPI</Text>
              )}
            </Section>

            {isManagerReport && kpiTable && (
              <Section className="my-[24px]">
                <Heading className="mx-0 my-[16px] p-0 text-[16px] font-semibold text-black">
                  📊 Итоги по всем сотрудникам
                </Heading>
                <Text className="text-[14px] leading-[24px] text-black">
                  • Входящие: {kpiTable.totals.incomingCount} звонков
                  <br />
                  • Исходящие: {kpiTable.totals.outgoingCount} звонков
                  <br />
                  • Всего: {kpiTable.totals.totalCount} звонков
                  {kpiTable.totals.evaluatedCount > 0 && (
                    <>
                      <br />
                      • Оценено: {kpiTable.totals.evaluatedCount} из {kpiTable.totals.totalCount} звонков
                    </>
                  )}
                  {avgManagerScore && kpiTable.overallAvgManagerScore != null && (
                    <>
                      <br />
                      • Средняя оценка качества: {formatScore(kpiTable.overallAvgManagerScore)} ⭐
                    </>
                  )}
                </Text>
              </Section>
            )}

            {isManagerReport && Object.entries(lowRatedCalls).filter(([, n]) => n > 0).length > 0 && (
              <Section className="my-[24px]">
                <Heading className="mx-0 my-[16px] p-0 text-[16px] font-semibold text-red-600">
                  ⚠️ Требуют внимания (оценка &lt; 3)
                </Heading>
                <Text className="text-[14px] leading-[24px] text-black">
                  {Object.entries(lowRatedCalls)
                    .filter(([, n]) => n > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([manager, count]) => (
                      <span key={manager}>
                        • {manager}: {count} {pluralizeCalls(count)}
                        <br />
                      </span>
                    ))}
                </Text>
              </Section>
            )}

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />

            <Text className="text-[12px] leading-[24px] text-[#666666]">
              Это автоматическое письмо от{" "}
              <Link href={env.APP_URL} className="text-blue-600 no-underline">
                {APP_CONFIG.shortName}
              </Link>
              . Вы получаете его, потому что включили email-отчёты в настройках. Отписаться можно в
              разделе «Настройки отчётов».
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ReportEmail;
