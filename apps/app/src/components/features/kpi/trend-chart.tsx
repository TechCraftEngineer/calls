"use client";

import type { DailyKpiRow } from "@calls/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  Skeleton,
  ToggleGroup,
  ToggleGroupItem,
} from "@calls/ui";
import { Clock, Phone, TrendingUp, Wallet } from "lucide-react";
import * as React from "react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { getColorByPercentage } from "@/lib/kpi-utils";

interface TrendChartProps {
  data: DailyKpiRow[];
  loading: boolean;
}

type MetricType = "talkTime" | "calls" | "bonus";

interface MetricConfig {
  key: MetricType;
  label: string;
  icon: React.ReactNode;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}

// Конфигурация метрик
const METRICS: MetricConfig[] = [
  {
    key: "talkTime",
    label: "Время разговоров",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "hsl(var(--primary))",
    gradientFrom: "hsl(var(--primary) / 0.3)",
    gradientTo: "hsl(var(--primary) / 0.05)",
  },
  {
    key: "calls",
    label: "Звонки",
    icon: <Phone className="h-3.5 w-3.5" />,
    color: "hsl(217, 91%, 60%)",
    gradientFrom: "hsl(217, 91%, 60% / 0.3)",
    gradientTo: "hsl(217, 91%, 60% / 0.05)",
  },
  {
    key: "bonus",
    label: "Бонусы",
    icon: <Wallet className="h-3.5 w-3.5" />,
    color: "hsl(142, 76%, 36%)",
    gradientFrom: "hsl(142, 76%, 36% / 0.3)",
    gradientTo: "hsl(142, 76%, 36% / 0.05)",
  },
];

// Skeleton для загрузки
function ChartSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[350px] w-full" />
      </CardContent>
    </Card>
  );
}

// Утилита для получения HSL цвета по проценту выполнения
function getHslColor(percentage: number): string {
  const color = getColorByPercentage(percentage);
  if (color === "green") return "hsl(142, 76%, 36%)";
  if (color === "yellow") return "hsl(48, 96%, 53%)";
  return "hsl(0, 84%, 60%)";
}

// Утилита для форматирования чисел
function formatNumber(value: number): string {
  return value.toLocaleString("ru-RU");
}

// Утилита для форматирования валюты
function formatCurrency(value: number): string {
  return `${formatNumber(value)} ₽`;
}

// Русские названия месяцев для ручного форматирования (без зависимости от таймзоны)
const RUSSIAN_MONTH_NAMES = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const RUSSIAN_MONTH_NAMES_SHORT = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

// Утилита для форматирования даты из YYYY-MM-DD в русский формат без timezone сдвигов
function formatRussianDate(dateStr: string, shortMonth = false): string {
  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  const month = Number.parseInt(dateStr.slice(5, 7), 10);
  const day = Number.parseInt(dateStr.slice(8, 10), 10);

  const paddedDay = day.toString().padStart(2, "0");

  if (shortMonth) {
    const monthShort = RUSSIAN_MONTH_NAMES_SHORT[month - 1] ?? String(month).padStart(2, "0");
    return `${paddedDay}.${monthShort}`;
  }

  const monthName = RUSSIAN_MONTH_NAMES[month - 1] ?? String(month);
  return `${paddedDay} ${monthName} ${year}`;
}

// Конфигурация графика
const chartConfig = {
  actualTalkTime: {
    label: "Фактическое время",
    color: "hsl(var(--primary))",
  },
  targetTalkTime: {
    label: "Целевое время",
    color: "hsl(var(--muted-foreground))",
  },
  totalCalls: {
    label: "Всего звонков",
    color: "hsl(217, 91%, 60%)",
  },
  dailyBonus: {
    label: "Бонус",
    color: "hsl(142, 76%, 36%)",
  },
};

// Главный компонент графика
export const TrendChart = React.memo(function TrendChart({ data, loading }: TrendChartProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [activeMetrics, setActiveMetrics] = React.useState<MetricType[]>(["talkTime"]);

  // Определяем мобильное устройство
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Подготовка данных для графика
  const chartData = React.useMemo(
    () =>
      data?.map((row) => ({
        date: row.date,
        formattedDate: formatRussianDate(row.date, true),
        fullDate: formatRussianDate(row.date, false),
        actualTalkTime: row.actualTalkTimeMinutes,
        targetTalkTime: row.targetTalkTimeMinutes,
        totalCalls: row.totalCalls,
        dailyBonus: row.dailyBonus,
        completionPercentage: row.completionPercentage,
      })) || [],
    [data],
  );

  // Получаем данные для сводки
  const summaryData = React.useMemo(() => {
    if (!data || data.length === 0) return null;
    const totalTalkTime = data.reduce((sum, row) => sum + row.actualTalkTimeMinutes, 0);
    const totalTarget = data.reduce((sum, row) => sum + row.targetTalkTimeMinutes, 0);
    const totalCalls = data.reduce((sum, row) => sum + row.totalCalls, 0);
    const totalBonus = data.reduce((sum, row) => sum + row.dailyBonus, 0);
    const avgCompletion = totalTarget > 0 ? Math.round((totalTalkTime / totalTarget) * 100) : 0;

    return { totalTalkTime, totalTarget, totalCalls, totalBonus, avgCompletion };
  }, [data]);

  if (loading) return <ChartSkeleton />;
  if (!data || data.length === 0) return null;

  const showTalkTime = activeMetrics.includes("talkTime");
  const showCalls = activeMetrics.includes("calls");
  const showBonus = activeMetrics.includes("bonus");

  // Динамически вычисляем правый margin в зависимости от количества осей
  const rightAxisCount = (showCalls ? 1 : 0) + (showBonus ? 1 : 0);
  const rightMargin = isMobile
    ? rightAxisCount === 2
      ? 90
      : rightAxisCount === 1
        ? 50
        : 10
    : rightAxisCount === 2
      ? 120
      : rightAxisCount === 1
        ? 70
        : 20;

  return (
    <div className="space-y-4">
      {/* Сводка показателей */}
      {summaryData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="h-3.5 w-3.5" />
              Время разговоров
            </div>
            <div className="mt-1 text-lg font-semibold">
              {formatNumber(summaryData.totalTalkTime)}{" "}
              <span className="text-sm font-normal text-muted-foreground">мин</span>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Выполнение плана
            </div>
            <div
              className="mt-1 text-lg font-semibold"
              style={{ color: getHslColor(summaryData.avgCompletion) }}
            >
              {summaryData.avgCompletion}%
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Phone className="h-3.5 w-3.5" />
              Звонки
            </div>
            <div className="mt-1 text-lg font-semibold">{formatNumber(summaryData.totalCalls)}</div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Wallet className="h-3.5 w-3.5" />
              Бонусы
            </div>
            <div className="mt-1 text-lg font-semibold">
              {formatCurrency(summaryData.totalBonus)}
            </div>
          </Card>
        </div>
      )}

      {/* График */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">Динамика показателей</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Выберите метрики для отображения
              </CardDescription>
            </div>
            <ToggleGroup
              type="multiple"
              value={activeMetrics}
              onValueChange={(value) => setActiveMetrics(value as MetricType[])}
              className="flex-wrap"
              spacing={1}
            >
              {METRICS.map((metric) => (
                <ToggleGroupItem
                  key={metric.key}
                  value={metric.key}
                  aria-label={metric.label}
                  className="text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    {metric.icon}
                    <span className="hidden sm:inline">{metric.label}</span>
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-[2/1] md:aspect-[3/1]">
            <ComposedChart
              data={chartData}
              margin={{
                top: 10,
                right: rightMargin,
                left: isMobile ? 0 : 10,
                bottom: 10,
              }}
            >
              <defs>
                {/* Градиенты для area */}
                <linearGradient id="talkTimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={METRICS[0].gradientFrom} />
                  <stop offset="95%" stopColor={METRICS[0].gradientTo} />
                </linearGradient>
                <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={METRICS[1].gradientFrom} />
                  <stop offset="95%" stopColor={METRICS[1].gradientTo} />
                </linearGradient>
                <linearGradient id="bonusGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={METRICS[2].gradientFrom} />
                  <stop offset="95%" stopColor={METRICS[2].gradientTo} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border) / 0.5)"
              />
              <XAxis
                dataKey="formattedDate"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 11 }}
                interval={isMobile ? "preserveStartEnd" : "equidistantPreserveStart"}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 11 }}
                width={isMobile ? 30 : 40}
              />
              {showCalls && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 11 }}
                  width={isMobile ? 35 : 50}
                />
              )}
              {showBonus && (
                <YAxis
                  yAxisId="right-bonus"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 11 }}
                  tickFormatter={(value) => formatCurrency(value as number)}
                  width={isMobile ? 50 : 65}
                />
              )}

              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0]?.payload;
                  if (!data) return null;

                  return (
                    <div className="border-border/50 bg-background grid min-w-[10rem] items-start gap-2 rounded-lg border px-3 py-2 text-xs shadow-xl">
                      <div className="font-medium border-b border-border/50 pb-1.5 mb-1">
                        {data.fullDate}
                      </div>
                      <div className="grid gap-1.5">
                        {showTalkTime && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: METRICS[0].color }}
                              />
                              Время разговоров
                            </span>
                            <span className="font-medium">{data.actualTalkTime} мин</span>
                          </div>
                        )}
                        {showTalkTime && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: "hsl(var(--muted-foreground))" }}
                              />
                              Целевое время
                            </span>
                            <span className="font-medium">{data.targetTalkTime} мин</span>
                          </div>
                        )}
                        {showCalls && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: METRICS[1].color }}
                              />
                              Звонки
                            </span>
                            <span className="font-medium">{data.totalCalls}</span>
                          </div>
                        )}
                        {showBonus && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: METRICS[2].color }}
                              />
                              Бонус
                            </span>
                            <span className="font-medium">{formatCurrency(data.dailyBonus)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-1.5 mt-1">
                          <span className="text-muted-foreground">Выполнение:</span>
                          <span
                            className="font-semibold"
                            style={{ color: getHslColor(data.completionPercentage) }}
                          >
                            {data.completionPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <ChartLegend content={<ChartLegendContent />} />

              {/* Целевое время - пунктирная линия */}
              {showTalkTime && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="targetTalkTime"
                  stroke={chartConfig.targetTalkTime.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name={chartConfig.targetTalkTime.label}
                />
              )}

              {/* Фактическое время с градиентом */}
              {showTalkTime && (
                <>
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="actualTalkTime"
                    stroke="none"
                    fill="url(#talkTimeGradient)"
                    fillOpacity={1}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="actualTalkTime"
                    stroke={METRICS[0].color}
                    strokeWidth={2.5}
                    dot={{
                      r: 3,
                      strokeWidth: 2,
                      stroke: "white",
                    }}
                    activeDot={{
                      r: 5,
                      strokeWidth: 2,
                      stroke: "white",
                    }}
                    name={chartConfig.actualTalkTime.label}
                  />
                </>
              )}

              {/* Звонки */}
              {showCalls && (
                <>
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalCalls"
                    stroke="none"
                    fill="url(#callsGradient)"
                    fillOpacity={0.3}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalCalls"
                    stroke={METRICS[1].color}
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      strokeWidth: 2,
                      stroke: "white",
                    }}
                    name={chartConfig.totalCalls.label}
                  />
                </>
              )}

              {/* Бонусы */}
              {showBonus && (
                <>
                  <Area
                    yAxisId="right-bonus"
                    type="monotone"
                    dataKey="dailyBonus"
                    stroke="none"
                    fill="url(#bonusGradient)"
                    fillOpacity={0.3}
                  />
                  <Line
                    yAxisId="right-bonus"
                    type="monotone"
                    dataKey="dailyBonus"
                    stroke={METRICS[2].color}
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      strokeWidth: 2,
                      stroke: "white",
                    }}
                    name={chartConfig.dailyBonus.label}
                  />
                </>
              )}
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
});
